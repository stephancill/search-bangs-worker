import {
  http,
  type Address,
  type Hex,
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
} from "viem";
import { injectBaseHref } from "./ens";

const DEFAULT_CHAIN_ID = 1;
const STUPID_EVM_RPC_TEMPLATE = "https://evm.stupidtech.net/v1/:chainId";

const requestAbi = [
  {
    inputs: [
      { name: "resource", type: "string[]" },
      {
        components: [
          { name: "key", type: "string" },
          { name: "value", type: "string" },
        ],
        name: "params",
        type: "tuple[]",
      },
    ],
    name: "request",
    outputs: [
      { name: "statusCode", type: "uint16" },
      { name: "body", type: "string" },
      {
        components: [
          { name: "key", type: "string" },
          { name: "value", type: "string" },
        ],
        name: "headers",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const htmlAbi = [
  {
    inputs: [],
    name: "html",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

type Web3Request = {
  address: Address;
  baseUrl: string;
  chainId: number;
  params: { key: string; value: string }[];
  resource: string[];
  rootUrl: string;
};

export function parseWeb3Request(
  rawQuery: string,
  origin = "https://search.stupidtech.net",
): Web3Request | null {
  const query = rawQuery.trim();

  if (isAddress(query)) {
    return web3RequestFromParts({
      address: getAddress(query),
      chainId: DEFAULT_CHAIN_ID,
      origin,
      params: [],
      pathname: "/",
    });
  }

  if (!/^(?:web3|w3|eth-web3|ethereum-web3):\/\//i.test(query)) {
    return null;
  }

  const url = new URL(query.replace(/^w3:\/\//i, "web3://"));
  const [contractName, chainIdText] = url.host.split(":");
  if (!isAddress(contractName)) {
    return null;
  }

  return web3RequestFromParts({
    address: getAddress(contractName),
    chainId: parseChainId(chainIdText),
    origin,
    params: [...url.searchParams.entries()].map(([key, value]) => ({ key, value })),
    pathname: url.pathname,
  });
}

export function parseWeb3Route(url: URL): Web3Request | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "web3" || parts.length < 3) {
    return null;
  }

  const chainId = parseChainId(parts[1]);
  const address = parts[2];
  if (!isAddress(address)) {
    return null;
  }

  return web3RequestFromParts({
    address: getAddress(address),
    chainId,
    origin: url.origin,
    params: [...url.searchParams.entries()].map(([key, value]) => ({ key, value })),
    pathname: `/${parts.slice(3).join("/")}`,
  });
}

export async function routeWeb3Request({
  origin,
  query,
}: {
  origin?: string;
  query: string;
}): Promise<Response | null> {
  const request = parseWeb3Request(query, origin);
  if (!request) {
    return null;
  }

  return executeWeb3Request(request);
}

export async function routeWeb3Path(url: URL): Promise<Response | null> {
  const request = parseWeb3Route(url);
  if (!request) {
    return null;
  }

  return executeWeb3Request(request);
}

async function executeWeb3Request(request: Web3Request): Promise<Response | null> {
  const client = createPublicClient({
    transport: http(STUPID_EVM_RPC_TEMPLATE.replace(":chainId", String(request.chainId))),
  });

  if (request.resource.length === 0) {
    const htmlResponse = await callHtml({ client, request });
    if (htmlResponse) {
      return htmlResponse;
    }
  }

  const data = encodeFunctionData({
    abi: requestAbi,
    functionName: "request",
    args: [request.resource, request.params],
  });

  try {
    const result = await client.call({ data, to: request.address });
    if (!result.data) {
      return request.resource.length === 0 ? callHtml({ client, request }) : null;
    }

    return responseFromResourceRequest({
      baseUrl: request.baseUrl,
      data: result.data,
      rootUrl: request.rootUrl,
    });
  } catch {
    return null;
  }
}

async function callHtml({
  client,
  request,
}: {
  client: ReturnType<typeof createPublicClient>;
  request: Web3Request;
}): Promise<Response | null> {
  try {
    const html = await client.readContract({
      address: request.address,
      abi: htmlAbi,
      functionName: "html",
    });

    return new Response(injectBaseHref(html, request.baseUrl, request.rootUrl), {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return null;
  }
}

export function responseFromResourceRequest({
  baseUrl,
  data,
  rootUrl = baseUrl,
}: {
  baseUrl: string;
  data: Hex;
  rootUrl?: string;
}): Response {
  const [statusCode, body, responseHeaders] = decodeFunctionResult({
    abi: requestAbi,
    functionName: "request",
    data,
  });
  const headers = new Headers();

  for (const { key, value } of responseHeaders) {
    headers.append(key, value);
  }

  headers.set("Cache-Control", headers.get("Cache-Control") ?? "public, max-age=300");

  if (isHtmlContentType(headers.get("Content-Type"))) {
    headers.delete("Content-Length");
    return new Response(injectBaseHref(body, baseUrl, rootUrl), { headers, status: statusCode });
  }

  return new Response(body, { headers, status: statusCode });
}

function pathResource(pathname: string): string[] {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

function parseChainId(chainIdText: string | undefined): number {
  const chainId = Number(chainIdText ?? DEFAULT_CHAIN_ID);
  return Number.isSafeInteger(chainId) && chainId > 0 ? chainId : DEFAULT_CHAIN_ID;
}

function isHtmlContentType(contentType: string | null): boolean {
  return (contentType ?? "").toLowerCase().includes("text/html");
}

function web3RequestFromParts({
  address,
  chainId,
  origin,
  params,
  pathname,
}: {
  address: Address;
  chainId: number;
  origin: string;
  params: { key: string; value: string }[];
  pathname: string;
}): Web3Request {
  return {
    address,
    baseUrl: web3RouteUrl({ address, chainId, origin, pathname }),
    chainId,
    params,
    resource: pathResource(pathname),
    rootUrl: web3RouteUrl({ address, chainId, origin, pathname: "/" }),
  };
}

function web3RouteUrl({
  address,
  chainId,
  origin,
  pathname,
}: {
  address: Address;
  chainId: number;
  origin: string;
  pathname: string;
}): string {
  const path = pathname === "/" ? "" : pathname.replace(/^\//, "");
  return `${origin}/web3/${chainId}/${address}/${path}`;
}
