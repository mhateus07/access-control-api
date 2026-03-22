import type { FastifyReply, FastifyRequest } from 'fastify'
import { redis } from '../../lib/redis'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()

    const jti = req.user.jti
    if (jti) {
      const isBlacklisted = await redis.get(`blacklist:${jti}`)
      if (isBlacklisted) {
        return reply.status(401).send({
          ok: false,
          message: 'Token revogado',
          code: 'TOKEN_REVOKED',
        })
      }
    }
  } catch {
    return reply.status(401).send({
      ok: false,
      message: 'Token inválido ou ausente',
      code: 'UNAUTHORIZED',
    })
  }
}
