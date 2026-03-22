import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '@prisma/client'

export function authorize(allowedRoles: Role[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const role = req.user?.role

    if (!role) {
      return reply.status(401).send({
        ok: false,
        message: 'Usuário sem role definida',
        code: 'UNAUTHORIZED',
      })
    }

    if (!allowedRoles.includes(role)) {
      return reply.status(403).send({
        ok: false,
        message: 'Permissão insuficiente',
        code: 'FORBIDDEN',
      })
    }
  }
}
