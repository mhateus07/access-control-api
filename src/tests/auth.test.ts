import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../app'
import { prisma } from '../lib/prisma'

async function cleanupTestUsers() {
  await prisma.loginLog.deleteMany({ where: { email: { endsWith: '@test.com' } } })
  await prisma.refreshToken.deleteMany({
    where: { user: { email: { endsWith: '@test.com' } } },
  })
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.com' } } })
}

describe('Auth Routes', () => {
  beforeEach(async () => {
    await cleanupTestUsers()
  })

  describe('POST /auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'Test User', email: 'register@test.com', password: 'Test1234' },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.ok).toBe(true)
      expect(body.data.email).toBe('register@test.com')
      expect(body.data).not.toHaveProperty('password')
    })

    it('should return 409 for duplicate email', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'User', email: 'dup@test.com', password: 'Test1234' },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'User 2', email: 'dup@test.com', password: 'Test1234' },
      })

      expect(res.statusCode).toBe(409)
      expect(JSON.parse(res.body).code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('should return 400 for weak password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'User', email: 'weak@test.com', password: 'weakpass' },
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'Login Test', email: 'login@test.com', password: 'Test1234' },
      })
    })

    it('should login and return access token + set refreshToken cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'login@test.com', password: 'Test1234' },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.ok).toBe(true)
      expect(body.data.accessToken).toBeDefined()
      expect(body.data.user.email).toBe('login@test.com')
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should return 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'login@test.com', password: 'WrongPass1' },
      })

      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.body).code).toBe('INVALID_CREDENTIALS')
    })

    it('should return 401 for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'ghost@test.com', password: 'Test1234' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('should create a login log entry on failed attempt', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'login@test.com', password: 'WrongPass1' },
      })

      const log = await prisma.loginLog.findFirst({
        where: { email: 'login@test.com', success: false },
      })
      expect(log).not.toBeNull()
      expect(log?.success).toBe(false)
    })

    it('should create a login log entry on successful login', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'login@test.com', password: 'Test1234' },
      })

      const log = await prisma.loginLog.findFirst({
        where: { email: 'login@test.com', success: true },
      })
      expect(log).not.toBeNull()
      expect(log?.success).toBe(true)
    })
  })

  describe('GET /auth/me', () => {
    it('should return user data for authenticated request', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'Me Test', email: 'me@test.com', password: 'Test1234' },
      })
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'me@test.com', password: 'Test1234' },
      })
      const { accessToken } = JSON.parse(loginRes.body).data

      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).data.role).toBe('USER')
    })

    it('should return 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/auth/me' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout and blacklist the access token', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'Logout Test', email: 'logout@test.com', password: 'Test1234' },
      })
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'logout@test.com', password: 'Test1234' },
      })
      const { accessToken } = JSON.parse(loginRes.body).data

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: `Bearer ${accessToken}` },
      })
      expect(logoutRes.statusCode).toBe(200)

      // Token deve estar na blacklist — próxima requisição deve retornar 401
      const meRes = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      })
      expect(meRes.statusCode).toBe(401)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should return new access token using refresh token cookie', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        body: { name: 'Refresh Test', email: 'refresh@test.com', password: 'Test1234' },
      })
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'refresh@test.com', password: 'Test1234' },
      })

      const setCookie = loginRes.headers['set-cookie'] as string
      const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie
      const tokenMatch = cookieHeader?.match(/refreshToken=([^;]+)/)
      const refreshToken = tokenMatch?.[1]

      expect(refreshToken).toBeDefined()

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refreshToken: refreshToken! },
      })

      expect(refreshRes.statusCode).toBe(200)
      const body = JSON.parse(refreshRes.body)
      expect(body.data.accessToken).toBeDefined()
    })

    it('should return 401 without refresh token cookie', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/refresh' })
      expect(res.statusCode).toBe(401)
    })
  })
})
