import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

async function createUser(email: string, role: Role = Role.USER) {
  return prisma.user.create({
    data: {
      name: 'Test User',
      email,
      password: await bcrypt.hash('Test1234', 10),
      role,
    },
  })
}

async function loginAs(email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    body: { email, password: 'Test1234' },
  })
  return JSON.parse(res.body).data.accessToken
}

describe('Users Routes', () => {
  beforeEach(async () => {
    await prisma.loginLog.deleteMany({ where: { email: { endsWith: '@test.com' } } })
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { endsWith: '@test.com' } } },
    })
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.com' } } })
  })

  describe('GET /users', () => {
    it('should list users for ADMIN', async () => {
      await createUser('admin@test.com', Role.ADMIN)
      const token = await loginAs('admin@test.com')

      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.ok).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toBeDefined()
    })

    it('should return 403 for USER role', async () => {
      await createUser('user@test.com', Role.USER)
      const token = await loginAs('user@test.com')

      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('should return 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/users' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('PATCH /users/:id/role', () => {
    it('should update user role', async () => {
      await createUser('admin2@test.com', Role.ADMIN)
      const target = await createUser('target@test.com', Role.USER)
      const token = await loginAs('admin2@test.com')

      const res = await app.inject({
        method: 'PATCH',
        url: `/users/${target.id}/role`,
        headers: { authorization: `Bearer ${token}` },
        body: { role: 'MANAGER' },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).data.role).toBe('MANAGER')
    })

    it('should return 403 when trying to change own role', async () => {
      const admin = await createUser('selfchange@test.com', Role.ADMIN)
      const token = await loginAs('selfchange@test.com')

      const res = await app.inject({
        method: 'PATCH',
        url: `/users/${admin.id}/role`,
        headers: { authorization: `Bearer ${token}` },
        body: { role: 'USER' },
      })

      expect(res.statusCode).toBe(403)
      expect(JSON.parse(res.body).code).toBe('CANNOT_CHANGE_OWN_ROLE')
    })
  })

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      await createUser('admin3@test.com', Role.ADMIN)
      const target = await createUser('todelete@test.com', Role.USER)
      const token = await loginAs('admin3@test.com')

      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${target.id}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(204)
    })

    it('should return 404 for non-existent user', async () => {
      await createUser('admin4@test.com', Role.ADMIN)
      const token = await loginAs('admin4@test.com')

      const res = await app.inject({
        method: 'DELETE',
        url: '/users/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
