import { prisma } from '../../lib/prisma'

export const logsRepository = {
  createLog(data: {
    userId: string | null
    email: string
    ip: string
    userAgent: string
    success: boolean
  }) {
    return prisma.loginLog.create({ data })
  },

  findAll(params: { page: number; limit: number; userId?: string; success?: boolean }) {
    const { page, limit, userId, success } = params
    const skip = (page - 1) * limit

    const where = {
      ...(userId ? { userId } : {}),
      ...(success !== undefined ? { success } : {}),
    }

    return Promise.all([
      prisma.loginLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.loginLog.count({ where }),
    ])
  },
}
