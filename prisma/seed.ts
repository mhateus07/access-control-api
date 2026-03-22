import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('Admin123', 10)
  const managerHash = await bcrypt.hash('Manager123', 10)
  const userHash = await bcrypt.hash('User1234', 10)

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@example.com', password: adminHash, role: Role.ADMIN },
  })

  await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: { name: 'Manager User', email: 'manager@example.com', password: managerHash, role: Role.MANAGER },
  })

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: { name: 'Regular User', email: 'user@example.com', password: userHash, role: Role.USER },
  })

  console.log('Seed completed successfully')
  console.log('  admin@example.com    / Admin123   (ADMIN)')
  console.log('  manager@example.com  / Manager123 (MANAGER)')
  console.log('  user@example.com     / User1234   (USER)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
