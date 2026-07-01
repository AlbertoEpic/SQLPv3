import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // Solo procesamos si es una página HTML
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    const basePrefix = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    if (!basePrefix || basePrefix === "/") {
      return response;
    }

    let html = await response.text();

    // Ajusta rutas absolutas legacy para que respeten BASE_URL en despliegues con subruta.
    html = html.replaceAll('src="/posts/', `src="${basePrefix}/posts/`);
    html = html.replaceAll('href="/posts/', `href="${basePrefix}/posts/`);

    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(html, {
      status: response.status,
      headers
    });
  }

  return response;
});