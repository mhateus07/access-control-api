import type { FastifyInstance } from 'fastify'
import { usersController } from './users.controller'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', authorize(['ADMIN']))

  app.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'Listar todos os usuários — ADMIN',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
          role: { type: 'string', enum: ['USER', 'MANAGER', 'ADMIN'] },
        },
      },
    },
  }, usersController.list)

  app.get('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Buscar usuário por ID — ADMIN',
      security: [{ bearerAuth: [] }],
    },
  }, usersController.getById)

  app.patch('/:id/role', {
    schema: {
      tags: ['Users'],
      summary: 'Atualizar role do usuário — ADMIN',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['USER', 'MANAGER', 'ADMIN'] },
        },
      },
    },
  }, usersController.updateRole)

  app.delete('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Deletar usuário — ADMIN',
      security: [{ bearerAuth: [] }],
    },
  }, usersController.delete)
}
