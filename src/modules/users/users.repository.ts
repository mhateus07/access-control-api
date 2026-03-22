import { prisma } from '../../lib/prisma'
import type { Role } from '@prisma/client'

export const usersRepository = {
  findAll(params: { page: number; limit: number; role?: Role }) {
    const { page, limit, role } = params
    const skip = (page - 1) * limit
    const where = role ? { role } : undefined

    return Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    })
  },

  updateRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, updatedAt: true },
    })
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } })
  },
}
