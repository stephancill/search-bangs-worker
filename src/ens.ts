import { CID } from "multiformats/cid";
import {
  http,
  type Address,
  type Hex,
  type PublicClient,
  createPublicClient,
  hexToBytes,
  namehash,
} from "viem";
import { mainnet } from "viem/chains";

const DEFAULT_MAINNET_RPC_URL = "https://evm.stupidtech.net/v1/1";
const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ENS_NAME_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.eth$/;
const IPFS_NAMESPACE = 0xe3;
const IPNS_NAMESPACE = 0xe5;
const PUBLIC_GATEWAY_HOSTS = [
  "dweb.link",
  "ipfs.io",
  "cloudflare-ipfs.com",
  "gateway.pinata.cloud",
];

const ensRegistryAbi = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ensResolverAbi = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "contenthash",
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

let defaultClient: PublicClient | undefined;

function clientForRpcUrl(rpcUrl?: string): PublicClient {
  if (rpcUrl) {
    return createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
  }

  defaultClient ??= createPublicClient({
    chain: mainnet,
    transport: http(DEFAULT_MAINNET_RPC_URL),
  });
  return defaultClient;
}

export function normalizeEnsQuery(rawQuery: string): string | null {
  const query = rawQuery.trim().toLowerCase();

  if (!ENS_NAME_PATTERN.test(query)) {
    return null;
  }

  return query;
}

export type ContenthashTarget = {
  namespace: "ipfs" | "ipns";
  value: string;
};

export function contenthashToTarget(hash: Hex): ContenthashTarget | null {
  if (hash === "0x") {
    return null;
  }

  const bytes = hexToBytes(hash);
  const { bytesRead, value: namespace } = readVarint(bytes, 0);

  if (namespace !== IPFS_NAMESPACE && namespace !== IPNS_NAMESPACE) {
    return null;
  }

  const value = CID.decode(bytes.slice(bytesRead)).toString();

  if (namespace === IPFS_NAMESPACE) {
    return { namespace: "ipfs", value };
  }

  return { namespace: "ipns", value };
}

export function contenthashToGatewayUrl(hash: Hex): string | null {
  const target = contenthashToTarget(hash);
  return target ? gatewayUrls({ target })[0] : null;
}

export function gatewayUrls({
  pinataGatewayHost,
  target,
}: {
  pinataGatewayHost?: string;
  target: ContenthashTarget;
}): string[] {
  const hosts = pinataGatewayHost
    ? [pinataGatewayHost.replace(/^https?:\/\//, "").replace(/\/$/, ""), ...PUBLIC_GATEWAY_HOSTS]
    : PUBLIC_GATEWAY_HOSTS;

  return hosts.map((host) => `https://${host}/${target.namespace}/${target.value}`);
}

export async function fetchFirstValidGatewayResponse(urls: string[]): Promise<Response | null> {
  const controllers = urls.map(() => new AbortController());

  try {
    const { index, response } = await Promise.any(
      urls.map(async (url, index) => {
        const response = await fetch(url, {
          headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
          signal: controllers[index].signal,
        });

        if (!isValidGatewayResponse(response)) {
          throw new Error(`Invalid gateway response from ${url}`);
        }

        return { index, response: await withGatewayHeaders(response, url) };
      }),
    );

    controllers.forEach((controller, controllerIndex) => {
      if (controllerIndex !== index) {
        controller.abort();
      }
    });

    return response;
  } catch {
    return null;
  }
}

function isValidGatewayResponse(response: Response): boolean {
  if (!response.ok) {
    return false;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  return !contentType.toLowerCase().includes("application/json");
}

async function withGatewayHeaders(response: Response, gatewayUrl: string): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "public, max-age=300");
  headers.set("X-ENS-Contenthash-Gateway", response.url || gatewayUrl);

  if (isHtmlResponse(response)) {
    headers.delete("Content-Length");

    return new Response(injectBaseHref(await response.text(), response.url || gatewayUrl), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isHtmlResponse(response: Response): boolean {
  const contentType = response.headers.get("Content-Type") ?? "";
  return contentType.toLowerCase().includes("text/html");
}

export function injectBaseHref(html: string, href: string): string {
  const base = `<base href="${escapeHtmlAttribute(ensureTrailingSlash(href))}">`;

  if (/<base\s/i.test(html)) {
    return html;
  }

  const headMatch = html.match(/<head(?:\s[^>]*)?>/i);
  if (headMatch?.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return `${html.slice(0, insertAt)}${base}${html.slice(insertAt)}`;
  }

  const htmlMatch = html.match(/<html(?:\s[^>]*)?>/i);
  if (htmlMatch?.index !== undefined) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return `${html.slice(0, insertAt)}<head>${base}</head>${html.slice(insertAt)}`;
  }

  return `${base}${html}`;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function readVarint(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;

  for (let index = offset; index < bytes.length; index++) {
    const byte = bytes[index];
    value += (byte & 0x7f) * 2 ** shift;

    if (byte < 0x80) {
      return { value, bytesRead: index - offset + 1 };
    }

    shift += 7;
  }

  throw new Error("Invalid contenthash varint");
}

export async function resolveEnsContenthashUrl({
  query,
  rpcUrl,
}: {
  query: string;
  rpcUrl?: string;
}): Promise<string | null> {
  const name = normalizeEnsQuery(query);
  if (!name) {
    return null;
  }

  try {
    const client = clientForRpcUrl(rpcUrl);
    const node = namehash(name);
    const resolver = await client.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ensRegistryAbi,
      functionName: "resolver",
      args: [node],
    });

    if (resolver.toLowerCase() === ZERO_ADDRESS) {
      return null;
    }

    const hash = await client.readContract({
      address: resolver as Address,
      abi: ensResolverAbi,
      functionName: "contenthash",
      args: [node],
    });

    return contenthashToGatewayUrl(hash);
  } catch {
    return null;
  }
}

export async function resolveEnsContenthashTarget({
  query,
  rpcUrl,
}: {
  query: string;
  rpcUrl?: string;
}): Promise<ContenthashTarget | null> {
  const name = normalizeEnsQuery(query);
  if (!name) {
    return null;
  }

  try {
    const client = clientForRpcUrl(rpcUrl);
    const node = namehash(name);
    const resolver = await client.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ensRegistryAbi,
      functionName: "resolver",
      args: [node],
    });

    if (resolver.toLowerCase() === ZERO_ADDRESS) {
      return null;
    }

    const hash = await client.readContract({
      address: resolver as Address,
      abi: ensResolverAbi,
      functionName: "contenthash",
      args: [node],
    });

    return contenthashToTarget(hash);
  } catch {
    return null;
  }
}
