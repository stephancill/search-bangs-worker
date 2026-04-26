import { DurableObject } from "cloudflare:workers";

export class QueryCounter extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/increment") {
      const current = ((await this.ctx.storage.get<number>("count")) ?? 0) + 1;
      await this.ctx.storage.put("count", current);
      return Response.json({ count: current });
    }

    if (request.method === "GET" && url.pathname === "/count") {
      const current = (await this.ctx.storage.get<number>("count")) ?? 0;
      return Response.json({ count: current });
    }

    return new Response("Not found", { status: 404 });
  }
}
