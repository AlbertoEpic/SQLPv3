import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Define schema for blog posts
const postsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().default('Untitled Post'),
    description: z.string().nullable().optional().default('No description provided'),
    date: z.coerce.date().optional(),
    pubDate: z.coerce.date().optional(),
    tags: z.array(z.string()).nullable().optional(),
    draft: z.boolean().optional(),
    image: z.any().nullable().optional(),
    heroImage: z.any().nullable().optional(),
    imageOG: z.boolean().optional(),
    imageAlt: z.string().nullable().optional(),
    hideCoverImage: z.boolean().optional(),
    hideTOC: z.boolean().optional(),
    showTOC: z.boolean().optional(),
    targetKeyword: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    noIndex: z.boolean().optional(),
  }).transform((data) => {
    const normalizeImage = (val: unknown) => {
      if (Array.isArray(val)) {
        return val[0] || null;
      }
      if (typeof val === 'string') {
        return val;
      }
      return null;
    };

    const normalizedImage = normalizeImage(data.image);
    const normalizedHeroImage = normalizeImage(data.heroImage);

    return {
      ...data,
      // Legacy compatibility: if date is missing, use pubDate.
      date: data.date ?? data.pubDate ?? new Date(),
      // Keep pubDate for consumers that want to prefer explicit publish date.
      pubDate: data.pubDate ?? data.date,
      // Legacy compatibility: heroImage is treated as image when image is missing.
      image: normalizedImage ?? normalizedHeroImage,
      heroImage: normalizedHeroImage ?? normalizedImage,
    };
  }),
});

// Define schema for static pages
const pagesCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().default('Untitled Page'),
    description: z.string().nullable().optional().default('No description provided'),
    draft: z.boolean().optional(),
    lastModified: z.coerce.date().optional(),
    image: z.any().nullable().optional().transform((val) => {
      // Handle various Obsidian syntax formats
      if (Array.isArray(val)) {
        // Handle array format from [[...]] syntax - take first element
        return val[0] || null;
      }
      if (typeof val === 'string') {
        // Handle string format - return as-is
        return val;
      }
      return null;
    }),
    imageAlt: z.string().nullable().optional(),
    hideCoverImage: z.boolean().optional(),
    hideTOC: z.boolean().optional(),
    showTOC: z.boolean().optional(),
    noIndex: z.boolean().optional(),
  }),
});

// Define schema for projects
const projectsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().default('Untitled Project'),
    description: z.string().nullable().optional().default('No description provided'),
    date: z.coerce.date().default(() => new Date()),
    categories: z.array(z.string()).nullable().optional().default([]),
    repositoryUrl: z.union([z.string(), z.null(), z.undefined()]).optional().transform(val => val || ''),
    projectUrl: z.union([z.string(), z.null(), z.undefined()]).optional().transform(val => val || ''),
    demoUrl: z.union([z.string(), z.null(), z.undefined()]).optional().transform(val => val || ''),
    demoURL: z.union([z.string(), z.null(), z.undefined()]).optional().transform(val => val || ''),
    status: z.string().nullable().optional(),
    image: z.any().nullable().optional().transform((val) => {
      // Handle various Obsidian syntax formats
      if (Array.isArray(val)) {
        // Handle array format from [[...]] syntax - take first element
        return val[0] || null;
      }
      if (typeof val === 'string') {
        // Handle string format - return as-is
        return val;
      }
      return null;
    }),
    imageAlt: z.string().nullable().optional(),
    hideCoverImage: z.boolean().optional(),
    hideTOC: z.boolean().optional(),
    showTOC: z.boolean().optional(),
    draft: z.boolean().optional(),
    noIndex: z.boolean().optional(),
    featured: z.boolean().optional(),
  }),
});

// Define schema for docs
const docsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string().default('Untitled Documentation'),
    description: z.string().nullable().optional().default('No description provided'),
    category: z.string().nullable().optional().default('General'),
    order: z.number().default(0),
    lastModified: z.coerce.date().optional(),
    version: z.string().nullable().optional(),
    image: z.any().nullable().optional().transform((val) => {
      // Handle various Obsidian syntax formats
      if (Array.isArray(val)) {
        // Handle array format from [[...]] syntax - take first element
        return val[0] || null;
      }
      if (typeof val === 'string') {
        // Handle string format - return as-is
        return val;
      }
      return null;
    }),
    imageAlt: z.string().nullable().optional(),
    hideCoverImage: z.boolean().optional(),
    hideTOC: z.boolean().optional(),
    draft: z.boolean().optional(),
    noIndex: z.boolean().optional(),
    showTOC: z.boolean().optional(),
    featured: z.boolean().optional(),
  }),
});

// Define schema for special home pages (homepage blurb, 404, projects index, docs index)
const specialCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/special' }),
  schema: z.object({
    title: z.string().default('Untitled Page'),
    description: z.string().nullable().optional().default('No description provided'),
    hideTOC: z.boolean().optional(),
    // These pages have fixed URLs and special logic
    // URLs are determined by the file location, not frontmatter
  }),
});

// Export collections
export const collections = {
  posts: postsCollection,
  pages: pagesCollection,
  projects: projectsCollection,
  docs: docsCollection,
  special: specialCollection,
};

