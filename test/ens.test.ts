import { describe, expect, it } from "vitest";
import { contenthashToGatewayUrl, normalizeEnsQuery } from "../src/ens";

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
