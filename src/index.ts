import { getBangTemplateByToken } from "./bangs";
import { QueryCounter } from "./counter";
import { resolveEnsContenthashUrl } from "./ens";
import { applyBangTemplate, googleLuckyUrl, googleSearchUrl, parseQuery } from "./routing";

type Env = {
  ASSETS: Fetcher;
  QUERY_COUNTER: DurableObjectNamespace;
  ETH_RPC_URL?: string;
};

function redirect(target: string): Response {
  return Response.redirect(target, 302);
}

async function routeQuery(rawQuery: string, env: Env): Promise<Response> {
  const ensUrl = await resolveEnsContenthashUrl({ query: rawQuery, rpcUrl: env.ETH_RPC_URL });
  if (ensUrl) {
    return redirect(ensUrl);
  }

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

function queryCounterStub(env: Env): DurableObjectStub {
  return env.QUERY_COUNTER.get(env.QUERY_COUNTER.idFromName("global"));
}

async function incrementQueryCount(env: Env): Promise<void> {
  await queryCounterStub(env).fetch("https://counter/increment", { method: "POST" });
}

async function getQueryCount(env: Env): Promise<number> {
  const response = await queryCounterStub(env).fetch("https://counter/count");
  if (!response.ok) {
    return 0;
  }

  const body = (await response.json()) as { count?: number };
  return body.count ?? 0;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/stats") {
      const count = await getQueryCount(env);
      return Response.json({ count });
    }

    if (url.pathname !== "/" && url.pathname !== "/search") {
      return env.ASSETS.fetch(request);
    }

    const query = url.searchParams.get("q");
    if (!query || query.trim().length === 0) {
      const landingRequest = new Request(new URL("/index.html", request.url));
      return env.ASSETS.fetch(landingRequest);
    }

    ctx.waitUntil(incrementQueryCount(env));

    return routeQuery(query, env);
  },
};

export { QueryCounter };
