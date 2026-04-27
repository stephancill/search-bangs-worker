import { getBangTemplateByToken } from "./bangs";
import { QueryCounter } from "./counter";
import { fetchFirstValidGatewayResponse, gatewayUrls, resolveEnsContenthashTarget } from "./ens";
import { applyBangTemplate, googleLuckyUrl, googleSearchUrl, parseQuery } from "./routing";
import { routeWeb3Path, routeWeb3Request } from "./web3url";

type Env = {
  ASSETS: Fetcher;
  QUERY_COUNTER: DurableObjectNamespace;
  ETH_RPC_URL?: string;
  PINATA_GATEWAY_HOST?: string;
};

function redirect(target: string): Response {
  return Response.redirect(target, 302);
}

async function routeQuery(rawQuery: string, env: Env, origin: string): Promise<Response> {
  const web3Response = await routeWeb3Request({ query: rawQuery, origin });
  if (web3Response) {
    return web3Response;
  }

  const ensTarget = await resolveEnsContenthashTarget({ query: rawQuery, rpcUrl: env.ETH_RPC_URL });
  if (ensTarget) {
    const response = await fetchFirstValidGatewayResponse(
      gatewayUrls({ target: ensTarget, pinataGatewayHost: env.PINATA_GATEWAY_HOST }),
    );

    if (response) {
      return response;
    }
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

    if (url.pathname.startsWith("/web3/")) {
      const response = await routeWeb3Path(url);
      return response ?? new Response("Not found", { status: 404 });
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

    return routeQuery(query, env, url.origin);
  },
};

export { QueryCounter };
