import "server-only";

export type Role = "OWNER" | "ADMIN" | "EDITOR" | "ANALYST";

export type Action =
  | "tenant.update"
  | "tenant.delete"
  | "tenant.billing"
  | "members.invite"
  | "members.remove"
  | "members.changeRole"
  | "domain.manage"
  | "page.create"
  | "page.update"
  | "page.publish"
  | "page.delete"
  | "funnel.create"
  | "funnel.update"
  | "funnel.delete"
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "contact.export"
  | "tag.manage"
  | "campaign.create"
  | "campaign.send"
  | "campaign.delete"
  | "automation.manage"
  | "template.manage"
  | "offer.manage"
  | "analytics.read";

const matrix: Record<Action, Role[]> = {
  "tenant.update":      ["OWNER", "ADMIN"],
  "tenant.delete":      ["OWNER"],
  "tenant.billing":     ["OWNER"],
  "members.invite":     ["OWNER", "ADMIN"],
  "members.remove":     ["OWNER", "ADMIN"],
  "members.changeRole": ["OWNER"],
  "domain.manage":      ["OWNER", "ADMIN"],
  "page.create":        ["OWNER", "ADMIN", "EDITOR"],
  "page.update":        ["OWNER", "ADMIN", "EDITOR"],
  "page.publish":       ["OWNER", "ADMIN", "EDITOR"],
  "page.delete":        ["OWNER", "ADMIN", "EDITOR"],
  "funnel.create":      ["OWNER", "ADMIN", "EDITOR"],
  "funnel.update":      ["OWNER", "ADMIN", "EDITOR"],
  "funnel.delete":      ["OWNER", "ADMIN", "EDITOR"],
  "contact.create":     ["OWNER", "ADMIN", "EDITOR"],
  "contact.update":     ["OWNER", "ADMIN", "EDITOR"],
  "contact.delete":     ["OWNER", "ADMIN", "EDITOR"],
  "contact.export":     ["OWNER", "ADMIN", "EDITOR", "ANALYST"],
  "tag.manage":         ["OWNER", "ADMIN", "EDITOR"],
  "campaign.create":    ["OWNER", "ADMIN", "EDITOR"],
  "campaign.send":      ["OWNER", "ADMIN", "EDITOR"],
  "campaign.delete":    ["OWNER", "ADMIN", "EDITOR"],
  "automation.manage":  ["OWNER", "ADMIN", "EDITOR"],
  "template.manage":    ["OWNER", "ADMIN", "EDITOR"],
  "offer.manage":       ["OWNER", "ADMIN", "EDITOR"],
  "analytics.read":     ["OWNER", "ADMIN", "EDITOR", "ANALYST"],
};

export function can(role: Role, action: Action): boolean {
  // Defensive: an action not in the matrix is denied (fail-closed), never throws
  return matrix[action]?.includes(role) ?? false;
}

export function requirePermission(role: Role, action: Action): void {
  if (!can(role, action)) throw new Error(`FORBIDDEN: role ${role} cannot ${action}`);
}
