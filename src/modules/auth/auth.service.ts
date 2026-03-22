import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { redis } from '../../lib/redis'
import { AppError } from '../../shared/errors/app-error'
import { authRepository } from './auth.repository'
import { logsRepository } from '../logs/logs.repository'
import type { LoginInput, RegisterInput } from './auth.schema'

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutos
const REFRESH_TOKEN_EXPIRY_DAYS = 7

export const authService = {
  async register(data: RegisterInput) {
    const exists = await authRepository.findUserByEmail(data.email)
    if (exists) {
      throw new AppError('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)
    return authRepository.createUser({ ...data, password: passwordHash })
  },

  async login(data: LoginInput, meta: { ip: string; userAgent: string }, app: FastifyInstance) {
    const user = await authRepository.findUserByEmail(data.email)
    const passwordOk = user ? await bcrypt.compare(data.password, user.password) : false

    // Registrar tentativa de login (sucesso ou falha) para auditoria
    await logsRepository.createLog({
      userId: passwordOk && user ? user.id : null,
      email: data.email,
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: passwordOk,
    })

    if (!user || !passwordOk) {
      throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS')
    }

    const jti = crypto.randomUUID()
    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role, jti },
      { expiresIn: '15m' },
    )

    const refreshToken = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    await authRepository.saveRefreshToken({ token: refreshToken, userId: user.id, expiresAt })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
  },

  async refresh(refreshToken: string, app: FastifyInstance) {
    const stored = await authRepository.findRefreshToken(refreshToken)

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await authRepository.deleteRefreshToken(refreshToken)
      throw new AppError('Refresh token inválido ou expirado', 401, 'INVALID_REFRESH_TOKEN')
    }

    // Refresh token rotation: invalidar o atual e emitir um novo par
    await authRepository.deleteRefreshToken(refreshToken)

    const jti = crypto.randomUUID()
    const accessToken = app.jwt.sign(
      { sub: stored.user.id, role: stored.user.role, jti },
      { expiresIn: '15m' },
    )

    const newRefreshToken = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    await authRepository.saveRefreshToken({ token: newRefreshToken, userId: stored.user.id, expiresAt })

    return { accessToken, refreshToken: newRefreshToken }
  },

  async logout(jti: string, userId: string, refreshToken?: string) {
    // Adicionar access token na blacklist do Redis (expira junto com o token)
    await redis.set(`blacklist:${jti}`, '1', 'EX', ACCESS_TOKEN_TTL_SECONDS)

    if (refreshToken) {
      await authRepository.deleteRefreshToken(refreshToken).catch(() => null)
    } else {
      await authRepository.deleteAllUserRefreshTokens(userId)
    }
  },
}
