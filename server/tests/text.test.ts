import { describe, expect, it } from "vitest";
import {
  cleanName,
  cleanSnippet,
  cleanText,
  safeHttpUrl,
  truncate,
} from "../src/services/text.js";

describe("cleanText", () => {
  it("strips control characters", () => {
    expect(cleanText("hel\u0000lo\u0007world")).toBe("helloworld");
  });

  it("strips bidi overrides and zero-width characters", () => {
    // These are the ones that let a string impersonate a different string.
    expect(cleanText("ab‮cd​e")).toBe("abcde");
  });

  it("collapses newlines to a single space", () => {
    // A snippet must not be able to forge a line in the prompt's evidence block.
    expect(cleanText("line one\nline two\r\nline three")).toBe("line one line two line three");
  });

  it("returns empty string for non-strings", () => {
    expect(cleanText(undefined)).toBe("");
    expect(cleanText(null)).toBe("");
    expect(cleanText(42)).toBe("");
    expect(cleanText({})).toBe("");
  });
});

describe("truncate", () => {
  it("leaves short input untouched", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("cuts at a word boundary when one is late in the budget", () => {
    // 290 chars of filler, then a space, then a word that will not fit.
    const text = "a".repeat(290) + " word-tails-here";
    const out = truncate(text, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    // The partial word "word-t" was dropped rather than kept mid-word.
    expect(out.endsWith("a")).toBe(true);
  });

  it("hard-cuts when there is no late word boundary", () => {
    const out = truncate("x".repeat(400), 300);
    expect(out).toHaveLength(300);
  });
});

describe("cleanSnippet", () => {
  it("never exceeds 300 characters", () => {
    expect(cleanSnippet("x".repeat(1000))).toHaveLength(300);
  });

  it("strips and flattens before measuring", () => {
    const out = cleanSnippet("<script>\u0000alert(1)</script>".repeat(30));
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out).not.toContain("\u0000");
    expect(out).not.toContain("\n");
  });
});

describe("cleanName", () => {
  it("caps at 120 characters", () => {
    expect(cleanName("n".repeat(500))).toHaveLength(120);
  });
});

describe("safeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects javascript: and data: — these end up in an href", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects file: and ftp:", () => {
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("ftp://example.com/x")).toBeNull();
  });

  it("rejects relative and malformed input", () => {
    expect(safeHttpUrl("/relative/path")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });

  it("rejects a host with no dot", () => {
    expect(safeHttpUrl("http://localhost/x")).toBeNull();
  });
});
