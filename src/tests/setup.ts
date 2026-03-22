import { beforeAll, afterAll } from 'vitest'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { app } from '../app'

beforeAll(async () => {
  await redis.connect().catch(() => null) // já pode estar conectado
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
  await redis.quit().catch(() => null)
})
