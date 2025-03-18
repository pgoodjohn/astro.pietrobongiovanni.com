import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    schema: ({ image }) => z.object({
        title: z.string(),
        pubDate: z.coerce.date(),
        description: z.string(),
        heroImage: image().optional(),
        slug: z.string(),
        draft: z.boolean().optional().default(false),
    }),
});

const lists = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        updatedDate: z.coerce.date(),
        slug: z.string().optional(),
        draft: z.boolean().optional().default(false),
    }),
});

export const collections = { blog, lists }; 