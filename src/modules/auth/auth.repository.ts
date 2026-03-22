import { prisma } from '../../lib/prisma'

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  createUser(data: { name: string; email: string; password: string }) {
    return prisma.user.create({
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
  },

  saveRefreshToken(data: { token: string; userId: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data })
  },

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })
  },

  deleteRefreshToken(token: string) {
    return prisma.refreshToken.delete({ where: { token } })
  },

  deleteAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } })
  },
}
