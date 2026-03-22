import { AppError } from '../../shared/errors/app-error'
import { usersRepository } from './users.repository'
import type { ListUsersQuery, UpdateUserRoleInput } from './users.schema'

export const usersService = {
  async listAll(query: ListUsersQuery) {
    const [users, total] = await usersRepository.findAll(query)
    return {
      users,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  },

  async getById(id: string) {
    const user = await usersRepository.findById(id)
    if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')
    return user
  },

  async updateRole(id: string, data: UpdateUserRoleInput, requesterId: string) {
    if (id === requesterId) {
      throw new AppError('Não é possível alterar sua própria role', 403, 'CANNOT_CHANGE_OWN_ROLE')
    }

    const user = await usersRepository.findById(id)
    if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')

    return usersRepository.updateRole(id, data.role)
  },

  async delete(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new AppError('Não é possível deletar sua própria conta por esta rota', 403, 'CANNOT_DELETE_SELF')
    }

    const user = await usersRepository.findById(id)
    if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')

    await usersRepository.delete(id)
  },
}
