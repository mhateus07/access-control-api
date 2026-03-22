import type { FastifyReply } from 'fastify'

type SuccessOptions = {
  statusCode?: number
  meta?: Record<string, unknown>
}

type FailOptions = {
  statusCode?: number
  code?: string
  errors?: unknown
}

export function ok<T>(reply: FastifyReply, data: T, options: SuccessOptions = {}) {
  const { statusCode = 200, meta } = options
  return reply.status(statusCode).send({
    ok: true,
    data,
    ...(meta ? { meta } : {}),
  })
}

export function fail(reply: FastifyReply, message: string, options: FailOptions = {}) {
  const { statusCode = 400, code = 'BAD_REQUEST', errors } = options
  return reply.status(statusCode).send({
    ok: false,
    message,
    code,
    ...(errors ? { errors } : {}),
  })
}
