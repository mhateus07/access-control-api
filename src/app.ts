import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'

import { env } from './env'
import { redis } from './lib/redis'
import { swaggerPlugin } from './shared/plugins/swagger'
import { errorHandler } from './shared/errors/error-handler'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { logsRoutes } from './modules/logs/logs.routes'

export const app = fastify({ logger: env.NODE_ENV !== 'test' })

app.setErrorHandler(errorHandler)

app.register(cors, { origin: true, credentials: true })

app.register(cookie, {
  secret: env.JWT_REFRESH_SECRET,
})

app.register(jwt, {
  secret: env.JWT_ACCESS_SECRET,
  sign: { expiresIn: '15m' },
})

app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  redis,
  keyGenerator: (req) => req.ip,
})

if (env.NODE_ENV !== 'test') {
  app.register(swaggerPlugin)
}

app.register(authRoutes, { prefix: '/auth' })
app.register(usersRoutes, { prefix: '/users' })
app.register(logsRoutes, { prefix: '/logs' })

app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}))
