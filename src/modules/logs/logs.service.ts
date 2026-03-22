import { logsRepository } from './logs.repository'
import type { ListLogsQuery } from './logs.schema'

export const logsService = {
  async listAll(query: ListLogsQuery) {
    const [logs, total] = await logsRepository.findAll(query)
    return {
      logs,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  },
}
