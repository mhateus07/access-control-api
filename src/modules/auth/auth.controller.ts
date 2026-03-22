import type { FastifyReply, FastifyRequest } from 'fastify'
import { authService } from './auth.service'
import { registerSchema, loginSchema } from './auth.schema'
import { ok } from '../../shared/utils/http-response'
import { AppError } from '../../shared/errors/app-error'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
}

export const authController = {
  async register(req: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(req.body)
    const user = await authService.register(data)
    return ok(reply, user, { statusCode: 201 })
  },

  async login(req: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(req.body)
    const ip = req.ip
    const userAgent = req.headers['user-agent'] ?? 'unknown'

    const result = await authService.login(data, { ip, userAgent }, req.server)

    reply.setCookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return ok(reply, {
      accessToken: result.accessToken,
      user: result.user,
    })
  },

  async refresh(req: FastifyRequest, reply: FastifyReply) {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
      throw new AppError('Refresh token ausente', 401, 'MISSING_REFRESH_TOKEN')
    }

    const result = await authService.refresh(refreshToken, req.server)

    reply.setCookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return ok(reply, { accessToken: result.accessToken })
  },

  async logout(req: FastifyRequest, reply: FastifyReply) {
    const { jti, sub } = req.user as { jti: string; sub: string }
    const refreshToken = req.cookies.refreshToken

    await authService.logout(jti, sub, refreshToken)

    reply.clearCookie('refreshToken', { path: '/auth/refresh' })
    return ok(reply, { message: 'Logout realizado com sucesso' })
  },

  async me(req: FastifyRequest, reply: FastifyReply) {
    return ok(reply, {
      userId: req.user.sub,
      role: req.user.role,
    })
  },
}
