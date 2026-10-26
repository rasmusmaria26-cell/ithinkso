import { describe, expect, it } from "vitest";
import { canonicalizeUrl, dedupeLeads, identityKey } from "../src/services/search/dedupe.js";

describe("canonicalizeUrl", () => {
  it("equates http/https, trailing slash, case, and www", () => {
    const a = canonicalizeUrl("http://GitHub.com/o/r/");
    const b = canonicalizeUrl("https://www.github.com/o/r");
    expect(a).toBe("github.com/o/r");
    expect(b).toBe("github.com/o/r");
  });

  it("strips npm's git+ prefix and .git suffix", () => {
    expect(canonicalizeUrl("git+https://github.com/knuthtimo-lab/greenlenspro-cli.git")).toBe(
      "github.com/knuthtimo-lab/greenlenspro-cli",
    );
  });

  it("normalizes ssh:// and git@ forms", () => {
    expect(canonicalizeUrl("ssh://git@github.com/o/r")).toBe("github.com/o/r");
    expect(canonicalizeUrl("git@github.com:o/r")).toBe("github.com/o/r");
    expect(canonicalizeUrl("git://github.com/o/r.git")).toBe("github.com/o/r");
  });

  it("drops /tree/<ref> but KEEPS the monorepo sub-package path", () => {
    // This is the case a naive normalizer gets wrong in both directions.
    expect(canonicalizeUrl("https://github.com/o/mono/tree/main/packages/a")).toBe(
      "github.com/o/mono/packages/a",
    );
    expect(canonicalizeUrl("https://github.com/o/mono/tree/main/packages/b")).toBe(
      "github.com/o/mono/packages/b",
    );
  });

  it("treats two monorepo sub-packages as DIFFERENT identities", () => {
    const a = canonicalizeUrl("https://github.com/o/mono/tree/main/packages/a");
    const b = canonicalizeUrl("https://github.com/o/mono/tree/main/packages/b");
    expect(a).not.toBe(b);
  });

  it("drops view suffixes", () => {
    expect(canonicalizeUrl("https://github.com/o/r/issues/12")).toBe("github.com/o/r");
    expect(canonicalizeUrl("https://github.com/o/r/stargazers")).toBe("github.com/o/r");
    expect(canonicalizeUrl("https://github.com/o/r/pulls")).toBe("github.com/o/r");
  });

  it("drops query strings and fragments", () => {
    expect(canonicalizeUrl("https://github.com/o/r?tab=readme#install")).toBe("github.com/o/r");
  });

  it("rejects non-http schemes", () => {
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeUrl("ftp://x.com/y")).toBeNull();
    expect(canonicalizeUrl("")).toBeNull();
  });
});

describe("identityKey", () => {
  it("uses the npm repository link as the project identity", () => {
    const key = identityKey({
      url: "https://www.npmjs.com/package/greenlenspro-cli",
      source: "npm",
      repositoryUrl: "git+https://github.com/knuthtimo-lab/greenlenspro-cli.git",
    });
    expect(key).toBe("github.com/knuthtimo-lab/greenlenspro-cli");
  });

  it("falls back to the package page when there is no repository", () => {
    const key = identityKey({
      url: "https://www.npmjs.com/package/thing",
      source: "npm",
      repositoryUrl: null,
    });
    expect(key).toBe("npmjs.com/package/thing");
  });

  it("ignores repositoryUrl for non-npm sources", () => {
    const key = identityKey({
      url: "https://github.com/o/r",
      source: "github",
      repositoryUrl: "https://github.com/other/thing",
    });
    expect(key).toBe("github.com/o/r");
  });
});

describe("dedupeLeads", () => {
  const lead = (over: Partial<Parameters<typeof dedupeLeads>[0][number]> = {}) => ({
    name: "x",
    url: "https://example.com/x",
    source: "web" as const,
    snippet: "",
    ...over,
  });

  it("collapses an npm package and its GitHub repo into one lead", () => {
    const out = dedupeLeads([
      lead({
        name: "greenlenspro-cli",
        url: "https://github.com/knuthtimo-lab/greenlenspro-cli",
        source: "github",
      }),
      lead({
        name: "greenlenspro-cli",
        url: "https://www.npmjs.com/package/greenlenspro-cli",
        source: "npm",
        repositoryUrl: "git+https://github.com/knuthtimo-lab/greenlenspro-cli.git",
      }),
    ]);

    expect(out.kept).toHaveLength(1);
    // GitHub outranks npm, so the surviving lead is the GitHub one.
    expect(out.kept[0]!.source).toBe("github");
  });

  it("keeps monorepo sub-packages separate", () => {
    const out = dedupeLeads([
      lead({ name: "packages/a", url: "https://github.com/o/mono/tree/main/packages/a" }),
      lead({ name: "packages/b", url: "https://github.com/o/mono/tree/main/packages/b" }),
    ]);
    expect(out.kept).toHaveLength(2);
  });

  it("keeps same-name projects on different hosts", () => {
    const out = dedupeLeads([
      lead({ name: "Thing", url: "https://github.com/a/thing" }),
      lead({ name: "Thing", url: "https://gitlab.com/b/thing" }),
    ]);
    expect(out.kept).toHaveLength(2);
  });

  it("caps output and reports how many were dropped", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      lead({ name: `p${i}`, url: `https://example.com/p${i}` }),
    );
    const out = dedupeLeads(many, { cap: 20 });
    expect(out.kept).toHaveLength(20);
    expect(out.dropped).toBe(10);
  });

  it("does not silently drop unnormalizable URLs", () => {
    const out = dedupeLeads([lead({ url: "nonsense" }), lead({ url: "nonsense" })]);
    expect(out.kept).toHaveLength(1);
  });

  it("is deterministic: same input, same order", () => {
    const build = () => [
      lead({ name: "b", url: "https://example.com/b" }),
      lead({ name: "a", url: "https://example.com/a" }),
      lead({ name: "c", url: "https://github.com/o/c", source: "github" }),
    ];
    const first = dedupeLeads(build()).kept.map((l) => l.name);
    const second = dedupeLeads(build()).kept.map((l) => l.name);
    expect(first).toEqual(second);
  });
});
