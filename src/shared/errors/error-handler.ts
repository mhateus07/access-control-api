import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from './app-error'
import { fail } from '../utils/http-response'

export function errorHandler(
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return fail(reply, 'Dados inválidos', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      errors: error.flatten().fieldErrors,
    })
  }

  if (error instanceof AppError) {
    return fail(reply, error.message, {
      statusCode: error.statusCode,
      code: error.code,
    })
  }

  if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
    return fail(reply, error.message, {
      statusCode: (error as any).statusCode,
      code: 'FASTIFY_ERROR',
    })
  }

  reply.log.error(error)
  return fail(reply, 'Erro interno do servidor', {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
  })
}
