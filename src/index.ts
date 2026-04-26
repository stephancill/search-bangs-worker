import { getBangTemplateByToken } from "./bangs";
import { applyBangTemplate, googleLuckyUrl, googleSearchUrl, parseQuery } from "./routing";

type Env = {
  ASSETS: Fetcher;
};

function redirect(target: string): Response {
  return Response.redirect(target, 302);
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname !== "/search") {
      return new Response("Not found", { status: 404 });
    }

    const query = url.searchParams.get("q");
    if (!query || query.trim().length === 0) {
      const landingRequest = new Request(new URL("/index.html", request.url));
      return env.ASSETS.fetch(landingRequest);
    }

    return routeQuery(query);
  },
};
