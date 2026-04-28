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

export function contenthashToGatewayUrl(hash: Hex, name?: string): string | null {
  if (hash === "0x") {
    return null;
  }

  const bytes = hexToBytes(hash);
  const { bytesRead, value: namespace } = readVarint(bytes, 0);

  if (namespace !== IPFS_NAMESPACE && namespace !== IPNS_NAMESPACE) {
    return null;
  }

  const value = CID.decode(bytes.slice(bytesRead)).toString();
  const sref = name ? `?_sref=${encodeURIComponent(name)}` : "";

  if (namespace === IPFS_NAMESPACE) {
    return `https://ipfs.stupidtech.net/ipfs/${value}/${sref}`;
  }

  return `https://ipfs.stupidtech.net/ipns/${value}/${sref}`;
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

    return contenthashToGatewayUrl(hash, name);
  } catch {
    return null;
  }
}
