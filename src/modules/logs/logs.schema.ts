import { z } from 'zod'

export const listLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  success: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>
