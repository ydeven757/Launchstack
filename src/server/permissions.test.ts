import { describe, it, expect } from "vitest";
import { can, requirePermission, type Role } from "./permissions";

/**
 * Permission matrix MUST match the documented contract. Any change here is a
 * deliberate product decision — failing tests force you to read the diff.
 */

const ROLES: Role[] = ["OWNER", "ADMIN", "EDITOR", "ANALYST"];

describe("permissions.can", () => {
  it("owners can do everything in the matrix", () => {
    const actions = [
      "tenant.update", "tenant.delete", "tenant.billing",
      "members.invite", "members.remove", "members.changeRole",
      "domain.manage", "page.create", "page.update", "page.publish", "page.delete",
      "funnel.create", "funnel.update", "funnel.delete",
      "contact.create", "contact.update", "contact.delete", "contact.export",
      "tag.manage", "campaign.create", "campaign.send", "campaign.delete",
      "automation.manage", "template.manage", "offer.manage", "analytics.read",
    ] as const;
    for (const action of actions) {
      expect(can("OWNER", action), `OWNER should be able to ${action}`).toBe(true);
    }
  });

  it("ANALYST can only read analytics + export contacts (no writes)", () => {
    expect(can("ANALYST", "analytics.read")).toBe(true);
    expect(can("ANALYST", "contact.export")).toBe(true);
    expect(can("ANALYST", "contact.create")).toBe(false);
    expect(can("ANALYST", "contact.update")).toBe(false);
    expect(can("ANALYST", "contact.delete")).toBe(false);
    expect(can("ANALYST", "page.create")).toBe(false);
    expect(can("ANALYST", "campaign.send")).toBe(false);
  });

  it("ADMIN cannot delete the tenant or change member roles", () => {
    expect(can("ADMIN", "tenant.delete")).toBe(false);
    expect(can("ADMIN", "members.changeRole")).toBe(false);
    expect(can("ADMIN", "tenant.billing")).toBe(false);
    // But can do everything else
    expect(can("ADMIN", "tenant.update")).toBe(true);
    expect(can("ADMIN", "members.invite")).toBe(true);
    expect(can("ADMIN", "campaign.send")).toBe(true);
  });

  it("EDITOR cannot manage members or domains, but can do all content + CRM", () => {
    expect(can("EDITOR", "members.invite")).toBe(false);
    expect(can("EDITOR", "members.remove")).toBe(false);
    expect(can("EDITOR", "domain.manage")).toBe(false);
    expect(can("EDITOR", "tenant.delete")).toBe(false);
    expect(can("EDITOR", "page.create")).toBe(true);
    expect(can("EDITOR", "contact.delete")).toBe(true);
    expect(can("EDITOR", "campaign.send")).toBe(true);
    expect(can("EDITOR", "automation.manage")).toBe(true);
  });

  it("nobody (no matter the role) can do an undefined action", () => {
    for (const role of ROLES) {
      // @ts-expect-error — deliberately passing a string not in the matrix
      expect(can(role, "nonexistent.action")).toBeFalsy();
    }
  });
});

describe("permissions.requirePermission", () => {
  it("throws FORBIDDEN with role + action in the message when denied", () => {
    expect(() => requirePermission("ANALYST", "contact.delete")).toThrowError(/FORBIDDEN.*ANALYST.*contact\.delete/);
  });

  it("does not throw when allowed", () => {
    expect(() => requirePermission("OWNER", "tenant.delete")).not.toThrow();
    expect(() => requirePermission("ANALYST", "analytics.read")).not.toThrow();
  });
});
