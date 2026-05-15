/**
 * Joins the Astro BASE_URL with a path, ensuring exactly one slash separator.
 * Works regardless of whether BASE_URL has a trailing slash or not.
 *
 * Examples (BASE_URL = '/SQLPv3'):
 *   withBase('/posts/foo')  → '/SQLPv3/posts/foo'
 *   withBase('posts/foo')   → '/SQLPv3/posts/foo'
 */
export const withBase = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
};
