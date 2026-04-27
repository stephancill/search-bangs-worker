import { encodeFunctionResult } from "viem";
import { describe, expect, it } from "vitest";
import { parseWeb3Request, parseWeb3Route, responseFromResourceRequest } from "../src/web3url";

describe("parseWeb3Request", () => {
  it("parses web3 address URLs", () => {
    expect(parseWeb3Request("web3://0x000000000a4a4f895734cf70700b6f84aadbca6c/")).toMatchObject({
      address: "0x000000000A4A4F895734cF70700b6F84AadbcA6C",
      baseUrl: "https://search.stupidtech.net/web3/1/0x000000000A4A4F895734cF70700b6F84AadbcA6C/",
      chainId: 1,
      resource: [],
    });
  });

  it("parses web3 path resources", () => {
    expect(
      parseWeb3Request("web3://0x000000f7f90708c034c854efd1d5bfe8e9079e32/asset/1"),
    ).toMatchObject({
      address: "0x000000F7F90708c034C854EfD1D5BFE8e9079E32",
      chainId: 1,
      resource: ["asset", "1"],
    });
  });
});

describe("parseWeb3Route", () => {
  it("parses worker web3 resource routes", () => {
    expect(
      parseWeb3Route(
        new URL(
          "https://search.stupidtech.net/web3/1/0x000000f7f90708c034c854efd1d5bfe8e9079e32/theme.css",
        ),
      ),
    ).toMatchObject({
      address: "0x000000F7F90708c034C854EfD1D5BFE8e9079E32",
      chainId: 1,
      resource: ["theme.css"],
      rootUrl: "https://search.stupidtech.net/web3/1/0x000000F7F90708c034C854EfD1D5BFE8e9079E32/",
    });
  });
});

describe("responseFromResourceRequest", () => {
  it("returns ERC-5219 HTML with a base href", async () => {
    const data = encodeFunctionResult({
      abi: [
        {
          inputs: [],
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
      ],
      functionName: "request",
      result: [
        200,
        "<html><head></head><body>ok</body></html>",
        [{ key: "Content-Type", value: "text/html" }],
      ],
    });

    const response = responseFromResourceRequest({
      baseUrl: "https://search.stupidtech.net/web3/1/0x000000000A4A4F895734cF70700b6F84AadbcA6C/",
      data,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      '<base href="https://search.stupidtech.net/web3/1/0x000000000A4A4F895734cF70700b6F84AadbcA6C/">',
    );
  });

  it("rewrites root-relative asset URLs to worker web3 routes", async () => {
    const data = encodeFunctionResult({
      abi: [
        {
          inputs: [],
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
      ],
      functionName: "request",
      result: [
        200,
        '<html><head><script src="/_js/app.js"></script></head></html>',
        [{ key: "Content-Type", value: "text/html" }],
      ],
    });

    const response = responseFromResourceRequest({
      baseUrl: "https://search.stupidtech.net/web3/1/0x000000000A4A4F895734cF70700b6F84AadbcA6C/",
      data,
      rootUrl: "https://search.stupidtech.net/web3/1/0x000000000A4A4F895734cF70700b6F84AadbcA6C/",
    });

    expect(await response.text()).toContain(
      'src="https://search.stupidtech.net/web3/1/0x000000000A4A4F895734cF70700b6F84AadbcA6C/_js/app.js"',
    );
  });
});
