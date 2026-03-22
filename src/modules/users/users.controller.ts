import type { FastifyReply, FastifyRequest } from 'fastify'
import { usersService } from './users.service'
import { updateUserRoleSchema, listUsersQuerySchema } from './users.schema'
import { ok } from '../../shared/utils/http-response'

export const usersController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const query = listUsersQuerySchema.parse(req.query)
    const result = await usersService.listAll(query)
    return ok(reply, result.users, { meta: result.meta })
  },

  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string }
    const user = await usersService.getById(id)
    return ok(reply, user)
  },

  async updateRole(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string }
    const data = updateUserRoleSchema.parse(req.body)
    const requesterId = req.user.sub
    const user = await usersService.updateRole(id, data, requesterId)
    return ok(reply, user)
  },

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string }
    const requesterId = req.user.sub
    await usersService.delete(id, requesterId)
    return reply.status(204).send()
  },
}
