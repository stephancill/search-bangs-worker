import { describe, expect, it } from "vitest";
import { applyBangTemplate, googleLuckyUrl, googleSearchUrl, parseQuery } from "../src/routing";

describe("parseQuery", () => {
  it("parses bare lucky bang", () => {
    expect(parseQuery("!")).toEqual({ kind: "lucky", terms: "", original: "!" });
  });

  it("parses leading lucky bang", () => {
    expect(parseQuery("! rust lang")).toEqual({
      kind: "lucky",
      terms: "rust lang",
      original: "! rust lang",
    });
  });

  it("parses trailing lucky bang", () => {
    expect(parseQuery("rust lang !")).toEqual({
      kind: "lucky",
      terms: "rust lang",
      original: "rust lang !",
    });
  });

  it("parses trailing named bangs", () => {
    expect(parseQuery("rust lang !you")).toEqual({
      kind: "namedBang",
      bang: "you",
      terms: "rust lang",
      original: "rust lang !you",
    });
  });

  it("parses named bangs", () => {
    expect(parseQuery("!w cloudflare")).toEqual({
      kind: "namedBang",
      bang: "w",
      terms: "cloudflare",
      original: "!w cloudflare",
    });
  });

  it("keeps unknown bang text for fallback by preserving original", () => {
    expect(parseQuery("!notreal rust")).toEqual({
      kind: "namedBang",
      bang: "notreal",
      terms: "rust",
      original: "!notreal rust",
    });
  });
});

describe("google urls", () => {
  it("builds default google search url", () => {
    expect(googleSearchUrl("cloudflare workers")).toBe(
      "https://www.google.com/search?q=cloudflare+workers",
    );
  });

  it("builds lucky url with terms", () => {
    expect(googleLuckyUrl("cloudflare workers")).toBe(
      "https://www.google.com/search?btnI=I&q=cloudflare+workers",
    );
  });

  it("sends empty lucky query to google home", () => {
    expect(googleLuckyUrl("")).toBe("https://www.google.com/");
  });
});

describe("bang template", () => {
  it("replaces DDG bang placeholder", () => {
    expect(applyBangTemplate("https://example.com/?q={{{s}}}", "rust lang")).toBe(
      "https://example.com/?q=rust%20lang",
    );
  });
});
