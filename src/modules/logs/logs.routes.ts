import type { FastifyInstance } from 'fastify'
import { logsController } from './logs.controller'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function logsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', authorize(['ADMIN', 'MANAGER']))

  app.get('/', {
    schema: {
      tags: ['Logs'],
      summary: 'Listar login audit logs — ADMIN, MANAGER',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
          userId: { type: 'string', format: 'uuid' },
          success: { type: 'string', enum: ['true', 'false'] },
        },
      },
    },
  }, logsController.list)
}
