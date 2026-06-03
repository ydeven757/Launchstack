import { describe, it, expect } from "vitest";
import {
  signupSchema, contactSchema, formSubmissionSchema, campaignSchema,
  affiliateLinkSchema, domainSchema, automationSchema,
} from "./validators";

describe("signupSchema", () => {
  it("accepts a valid signup + lowercases the email", () => {
    const r = signupSchema.parse({ email: "Foo@Example.COM", password: "longenoughpw" });
    expect(r.email).toBe("foo@example.com");
  });

  it("rejects short passwords", () => {
    expect(() => signupSchema.parse({ email: "a@b.com", password: "short" })).toThrow();
  });

  it("rejects malformed emails", () => {
    expect(() => signupSchema.parse({ email: "not-an-email", password: "longenoughpw" })).toThrow();
  });
});

describe("contactSchema", () => {
  it("normalizes the email", () => {
    const r = contactSchema.parse({ email: "X@Y.COM" });
    expect(r.email).toBe("x@y.com");
  });

  it("accepts the documented status enum values", () => {
    for (const status of ["LEAD", "ENGAGED", "CUSTOMER", "UNSUBSCRIBED", "BOUNCED"] as const) {
      expect(() => contactSchema.parse({ email: "a@b.com", status })).not.toThrow();
    }
  });

  it("rejects an unknown status", () => {
    expect(() => contactSchema.parse({ email: "a@b.com", status: "VIP" })).toThrow();
  });
});

describe("formSubmissionSchema — the public-facing surface", () => {
  it("requires a pageId + valid email", () => {
    expect(() => formSubmissionSchema.parse({ pageId: "p1", email: "ok@b.com" })).not.toThrow();
    expect(() => formSubmissionSchema.parse({ pageId: "p1", email: "bad" })).toThrow();
  });

  it("strips utm to documented shape (no arbitrary props leak through)", () => {
    const r = formSubmissionSchema.parse({
      pageId: "p1", email: "a@b.com",
      utm: { source: "fb", medium: "cpc", campaign: "winter" },
    });
    expect(r.utm).toEqual({ source: "fb", medium: "cpc", campaign: "winter" });
  });
});

describe("affiliateLinkSchema", () => {
  it("rejects slugs with uppercase / spaces / special chars", () => {
    expect(() => affiliateLinkSchema.parse({ offerId: "o1", slug: "Has-Caps" })).toThrow();
    expect(() => affiliateLinkSchema.parse({ offerId: "o1", slug: "has space" })).toThrow();
    expect(() => affiliateLinkSchema.parse({ offerId: "o1", slug: "has/slash" })).toThrow();
  });

  it("accepts well-formed slugs", () => {
    expect(() => affiliateLinkSchema.parse({ offerId: "o1", slug: "valid-slug-123" })).not.toThrow();
  });
});

describe("domainSchema", () => {
  it("accepts realistic hostnames", () => {
    for (const h of ["example.com", "www.example.com", "sub.dom.example.co.uk", "my-site.io"]) {
      expect(() => domainSchema.parse({ hostname: h }), h).not.toThrow();
    }
  });

  it("rejects nonsense", () => {
    for (const h of ["nodot", "no_underscore.com", "", "http://withproto.com"]) {
      expect(() => domainSchema.parse({ hostname: h }), h).toThrow();
    }
  });
});

describe("campaignSchema", () => {
  it("requires fromEmail to be a real email", () => {
    expect(() => campaignSchema.parse({
      name: "x", subject: "y", fromName: "Z", fromEmail: "not-email", bodyHtml: "<p/>",
    })).toThrow();
  });
});

describe("automationSchema", () => {
  it("accepts each documented trigger", () => {
    for (const trigger of ["FORM_SUBMITTED", "TAG_ADDED", "PAGE_VISITED", "LINK_CLICKED"] as const) {
      expect(() => automationSchema.parse({
        name: "x", trigger, steps: [{ type: "add_tag", config: { tagId: "t1" } }],
      })).not.toThrow();
    }
  });

  it("rejects an unknown step type", () => {
    expect(() => automationSchema.parse({
      name: "x", trigger: "FORM_SUBMITTED",
      steps: [{ type: "format_disk", config: {} }],
    })).toThrow();
  });
});
