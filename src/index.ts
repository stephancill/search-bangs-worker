import { getBangTemplateByToken } from "./bangs";
import { landingPageHtml } from "./html";
import { applyBangTemplate, googleLuckyUrl, googleSearchUrl, parseQuery } from "./routing";

function redirect(target: string): Response {
  return Response.redirect(target, 302);
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

async function routeQuery(rawQuery: string): Promise<Response> {
  const parsed = parseQuery(rawQuery);

  if (parsed.kind === "lucky") {
    return redirect(googleLuckyUrl(parsed.terms));
  }

  if (parsed.kind === "default") {
    return redirect(googleSearchUrl(parsed.terms));
  }

  const template = await getBangTemplateByToken(parsed.bang);
  if (!template) {
    return redirect(googleSearchUrl(parsed.original));
  }

  return redirect(applyBangTemplate(template, parsed.terms));
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname !== "/search") {
      return new Response("Not found", { status: 404 });
    }

    const query = url.searchParams.get("q");
    if (!query || query.trim().length === 0) {
      return htmlResponse(landingPageHtml());
    }

    return routeQuery(query);
  },
};
