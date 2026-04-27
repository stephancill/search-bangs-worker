import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contenthashToGatewayUrl,
  fetchFirstValidGatewayResponse,
  gatewayUrls,
  normalizeEnsQuery,
} from "../src/ens";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeEnsQuery", () => {
  it("accepts bare .eth names", () => {
    expect(normalizeEnsQuery(" Vitalik.eth ")).toBe("vitalik.eth");
  });

  it("rejects search queries containing .eth names", () => {
    expect(normalizeEnsQuery("open vitalik.eth")).toBeNull();
  });
});

describe("contenthashToGatewayUrl", () => {
  it("maps IPFS contenthashes to an IPFS gateway URL", () => {
    const hash = "0xe301017012209d6c2be50f70695347c6da90ab413d0fba6aa026a4ea59a1588934c168a82316";

    expect(contenthashToGatewayUrl(hash)).toBe(
      "https://dweb.link/ipfs/bafybeie5nqv6kd3qnfjuprw2scvucpipxjvkajve5jm2cwejgtawrkbdcy",
    );
  });
});

describe("gatewayUrls", () => {
  it("prepends a configured Pinata gateway", () => {
    expect(
      gatewayUrls({
        pinataGatewayHost: "https://example.mypinata.cloud/",
        target: { namespace: "ipfs", value: "bafyexample" },
      }),
    ).toEqual([
      "https://example.mypinata.cloud/ipfs/bafyexample",
      "https://dweb.link/ipfs/bafyexample",
      "https://ipfs.io/ipfs/bafyexample",
      "https://cloudflare-ipfs.com/ipfs/bafyexample",
      "https://gateway.pinata.cloud/ipfs/bafyexample",
    ]);
  });
});

describe("fetchFirstValidGatewayResponse", () => {
  it("returns the first successful non-json gateway response", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url === "https://bad.example/ipfs/cid") {
        return new Response("not found", { status: 404 });
      }

      return new Response("ok", {
        headers: { "Content-Type": "text/html" },
        status: 200,
      });
    }) as typeof fetch);

    const response = await fetchFirstValidGatewayResponse([
      "https://bad.example/ipfs/cid",
      "https://good.example/ipfs/cid",
    ]);

    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe("ok");
  });

  it("ignores json responses from gateways", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"error":"not found"}', {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(
      fetchFirstValidGatewayResponse(["https://gateway.example/ipfs/cid"]),
    ).resolves.toBeNull();
  });
});
