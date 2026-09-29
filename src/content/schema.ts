import { z } from 'astro/zod';

export function createPostSchema<T extends z.ZodType>(imageSchema: T) {
  return z
    .object({
      title: z.string().min(1),
      description: z.string().min(1).max(220),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      tags: z.array(z.string().min(1)).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      series: z.string().optional(),
      seriesOrder: z.number().int().positive().optional(),
      coverImage: imageSchema.optional(),
      coverImageAlt: z.string().trim().min(1).optional(),
      coverImageCaption: z.string().trim().min(1).optional(),
    })
    .superRefine((post, context) => {
      if (post.coverImage && !post.coverImageAlt) {
        context.addIssue({
          code: 'custom',
          path: ['coverImageAlt'],
          message: 'coverImageAlt is required when coverImage is set',
        });
      }
      if (!post.coverImage && post.coverImageCaption) {
        context.addIssue({
          code: 'custom',
          path: ['coverImageCaption'],
          message: 'coverImageCaption requires coverImage',
        });
      }
    });
}
