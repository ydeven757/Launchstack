import "server-only";
import { hmacSha256, hmacSha1, safeEqual } from "../crypto";

/**
 * ClickBank INS (Instant Notification Service) helpers.
 *
 * INS 7.0 reference: https://support.clickbank.com/hc/en-us/articles/19571023213595
 * - ClickBank sends a POST with a JSON body and a `notification` header containing
 *   `iv|signature` for INS 7.x, or an `cbverify` field in the body for older versions.
 * - The signature is HMAC over the serialized payload using the account-level Secret Key.
 *
 * We support both:
 *  - Legacy: HMAC-SHA1 of (sorted JSON values) with the Secret Key
 *  - Modern: HMAC-SHA256 of the raw body with the Secret Key
 *
 * In production we strongly recommend INS 7.x + SHA-256. Verify with ClickBank's
 * current docs before going live.
 */

export type ClickBankTransactionType =
  | "SALE"   // initial sale
  | "BLRF"   // billing refund (refund issued for a rebill)
  | "RFND"   // refund
  | "CGBK"   // chargeback
  | "INSF"   // insufficient funds
  | "CANCEL-REBILL"
  | "UNCANCEL-REBILL"
  | "BILL"   // rebill
  | "TEST";  // test ping from ClickBank

export type ClickBankPayload = {
  receipt?: string;
  transactionType: ClickBankTransactionType;
  transactionTime?: string;
  affiliate?: string;
  vendor?: string;
  product?: { itemNo?: string; title?: string; quantity?: number };
  customer?: {
    billing?: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      email?: string;
      country?: string;
      state?: string;
      zip?: string;
    };
    shipping?: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      country?: string;
    };
  };
  transactionItems?: Array<{ amount?: number; itemNo?: string; title?: string }>;
  totalAccountAmount?: number;
  currency?: string;
  trackingCodes?: { tid?: string; vtid?: string };
  // legacy fields kept for compatibility
  tid?: string;
};

/**
 * Verify the HMAC signature for a raw payload. Returns true if valid.
 *
 * Tries SHA-256 first (modern INS), then SHA-1 (legacy). Constant-time comparison.
 */
export function verifyClickBankSignature(rawBody: string, providedSig: string | null, secret: string): boolean {
  if (!providedSig || !secret) return false;
  const sig = providedSig.toLowerCase().replace(/^sha(1|256)=/, "");
  const sha256 = hmacSha256(secret, rawBody);
  if (safeEqual(sig, sha256)) return true;
  const sha1 = hmacSha1(secret, rawBody);
  if (safeEqual(sig, sha1)) return true;
  return false;
}

export function extractTid(p: ClickBankPayload): string | null {
  return p.trackingCodes?.tid || p.tid || null;
}

export function extractCustomerEmail(p: ClickBankPayload): string | null {
  return p.customer?.billing?.email?.toLowerCase().trim() || null;
}

export function extractCustomerName(p: ClickBankPayload): { first?: string; last?: string } {
  const b = p.customer?.billing;
  if (!b) return {};
  return { first: b.firstName, last: b.lastName };
}

export function extractRevenue(p: ClickBankPayload): { amount: number; currency: string } {
  return {
    amount: p.totalAccountAmount ?? p.transactionItems?.reduce((a, i) => a + (i.amount ?? 0), 0) ?? 0,
    currency: (p.currency || "USD").toUpperCase(),
  };
}

export function isRefundType(t: ClickBankTransactionType): boolean {
  return t === "RFND" || t === "CGBK" || t === "BLRF" || t === "INSF";
}

export function isSaleType(t: ClickBankTransactionType): boolean {
  return t === "SALE" || t === "BILL";
}
