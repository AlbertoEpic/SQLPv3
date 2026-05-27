import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  
  // Solo procesamos si es una página HTML
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    let html = await response.text();
    
    // Reemplazamos src="/posts/ por src="/SQLPv3/posts/
    html = html.replaceAll('src="/posts/', 'src="/SQLPv3/posts/');
    // También por si usas el formato de markdown original en alguna parte (href o srcset)
    html = html.replaceAll('href="/posts/', 'href="/SQLPv3/posts/');

    return new Response(html, {
      status: response.status,
      headers: response.headers
    });
  }
  
  return response;
});