import { z } from 'zod';

export const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(220),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  tags: z.array(z.string().min(1)).default([]),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  series: z.string().optional(),
  seriesOrder: z.number().int().positive().optional(),
});
