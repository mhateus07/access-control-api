import type { FastifyReply, FastifyRequest } from 'fastify'
import { logsService } from './logs.service'
import { listLogsQuerySchema } from './logs.schema'
import { ok } from '../../shared/utils/http-response'

export const logsController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const query = listLogsQuerySchema.parse(req.query)
    const result = await logsService.listAll(query)
    return ok(reply, result.logs, { meta: result.meta })
  },
}
