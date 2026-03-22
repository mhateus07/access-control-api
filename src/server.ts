import { app } from './app'
import { env } from './env'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'

async function bootstrap() {
  try {
    await redis.connect()
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Server running on http://localhost:${env.PORT}`)
    app.log.info(`Docs available at http://localhost:${env.PORT}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()

process.on('SIGTERM', async () => {
  await app.close()
  await prisma.$disconnect()
  await redis.quit()
  process.exit(0)
})
