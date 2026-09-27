import { describe, it, expect } from "vitest";
import { parseVariations } from "./paperclip-client";

describe("parseVariations", () => {
  it("splits on --- separator lines", () => {
    const body = "Headline one\n---\nHeadline two\n---\nHeadline three";
    expect(parseVariations(body)).toEqual(["Headline one", "Headline two", "Headline three"]);
  });

  it("handles CRLF line endings", () => {
    const body = "A\r\n---\r\nB\r\n---\r\nC";
    expect(parseVariations(body)).toEqual(["A", "B", "C"]);
  });

  it("trims whitespace and drops empty chunks", () => {
    const body = "  A  \n---\n\n---\nB\n---\n";
    expect(parseVariations(body)).toEqual(["A", "B"]);
  });

  it("returns empty array for null/empty body", () => {
    expect(parseVariations(null)).toEqual([]);
    expect(parseVariations("")).toEqual([]);
    expect(parseVariations("   ")).toEqual([]);
  });

  it("returns a single variation when no separator present", () => {
    expect(parseVariations("Just one headline")).toEqual(["Just one headline"]);
  });
});
