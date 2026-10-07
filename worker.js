import legacy from './scripts/wordpress-legacy-urls.json';

// Only runs for "/" (see run_worker_first in wrangler.toml): redirects old WordPress
// short links (/?p=123, /?page_id=45) to their new URL, everything else is served as static assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = url.searchParams.get('p') || url.searchParams.get('page_id');
    const target = id && legacy.ids[id];
    if (target) {
      return Response.redirect(new URL(target, url.origin).toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
