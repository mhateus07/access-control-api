import type { FastifyInstance } from 'fastify'
import { authController } from './auth.controller'
import { authenticate } from '../../shared/middlewares/authenticate'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Registrar novo usuário',
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, example: 'Mateus Henrique' },
          email: { type: 'string', format: 'email', example: 'mateus@example.com' },
          password: { type: 'string', minLength: 8, example: 'Senha123' },
        },
      },
      response: {
        201: { description: 'Usuário criado com sucesso' },
        409: { description: 'E-mail já cadastrado' },
      },
    },
  }, authController.register)

  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Autenticar usuário — retorna access token e seta cookie refreshToken (HttpOnly)',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          password: { type: 'string', example: 'Admin123' },
        },
      },
      response: {
        200: { description: 'Login realizado com sucesso' },
        401: { description: 'Credenciais inválidas' },
      },
    },
  }, authController.login)

  app.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Renovar access token usando refresh token (cookie HttpOnly)',
      response: {
        200: { description: 'Novo access token gerado' },
        401: { description: 'Refresh token inválido ou expirado' },
      },
    },
  }, authController.refresh)

  app.post('/logout', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Logout — invalida access token no Redis e remove refresh token',
      security: [{ bearerAuth: [] }],
    },
  }, authController.logout)

  app.get('/me', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Dados do usuário autenticado',
      security: [{ bearerAuth: [] }],
    },
  }, authController.me)
}
