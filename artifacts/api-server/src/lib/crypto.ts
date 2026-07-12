import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/** Opaque, unguessable token for invitations / tables / sessions (FR-013). */
export function generateToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

function qrSigningSecret(): string {
  return (
    process.env["QR_SIGNING_SECRET"] ||
    process.env["DATABASE_URL"] ||
    "local-dev-qr-secret"
  );
}

export function signQrToken(
  kind: "invite" | "table",
  token: string,
): string {
  return createHmac("sha256", qrSigningSecret())
    .update(`${kind}:${token}`)
    .digest("base64url");
}

export function verifyQrTokenSignature(
  kind: "invite" | "table",
  token: string,
  signature: string,
): boolean {
  const expected = Buffer.from(signQrToken(kind, token));
  const candidate = Buffer.from(signature);
  return (
    expected.length === candidate.length &&
    timingSafeEqual(expected, candidate)
  );
}
