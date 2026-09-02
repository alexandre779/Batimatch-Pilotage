import "server-only";
import { env as cloudflareBindings } from "cloudflare:workers";
import { FIELDS, TABLES } from "@/lib/airtable/config";
import { listRecords } from "@/lib/airtable/client";

type RuntimeBindings = { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string };
type AccessPayload = { aud?: string | string[]; email?: string; exp?: number; iss?: string; nbf?: number };

export type PilotageAccess = {
  email: string | null;
  groupId: string | null;
  role: "network" | "president";
  secured: boolean;
};

const runtimeBindings = cloudflareBindings as RuntimeBindings;
const runtimeVariable = (name: keyof RuntimeBindings) => runtimeBindings[name] ?? process.env[name];

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

async function verifyAccessToken(token: string, teamDomain: string, audience: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Jeton Cloudflare Access invalide");

  const header = decodeJson<{ alg?: string; kid?: string }>(parts[0]);
  const payload = decodeJson<AccessPayload>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Jeton Cloudflare Access invalide");

  const issuer = (teamDomain.startsWith("http://") || teamDomain.startsWith("https://")
    ? teamDomain
    : `https://${teamDomain}`
  ).replace(/\/$/, "");
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== issuer || !audiences.includes(audience) || !payload.exp || payload.exp <= now || (payload.nbf && payload.nbf > now)) {
    throw new Error("Jeton Cloudflare Access expiré ou non autorisé");
  }

  const response = await fetch(`${issuer}/cdn-cgi/access/certs`, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Impossible de vérifier Cloudflare Access");
  const { keys } = await response.json() as { keys: Array<JsonWebKey & { kid?: string }> };
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Clé Cloudflare Access inconnue");

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid || !payload.email) throw new Error("Identité Cloudflare Access invalide");
  return payload.email.trim().toLowerCase();
}

const firstLinkedRecord = (value: unknown) => Array.isArray(value) && typeof value[0] === "string" ? value[0] : null;
const selectName = (value: unknown) => typeof value === "string"
  ? value
  : value && typeof value === "object" && "name" in value && typeof value.name === "string" ? value.name : "";

export async function getPilotageAccess(accessToken: string | null): Promise<PilotageAccess> {
  const teamDomain = runtimeVariable("ACCESS_TEAM_DOMAIN");
  const audience = runtimeVariable("ACCESS_AUD");

  // Keep the current dashboard reachable until Access is configured. Once both
  // variables exist, authentication and Airtable authorization are mandatory.
  if (!teamDomain || !audience) return { email: null, groupId: null, role: "network", secured: false };
  if (!accessToken) throw new Error("Connexion requise");

  const email = await verifyAccessToken(accessToken, teamDomain, audience);
  const fields = FIELDS.users;
  const users = await listRecords(TABLES.users, [fields.email, fields.memberStatus, fields.ownedGroups, fields.pilotageRole]);
  const user = users.find((record) => String(record.fields[fields.email] ?? "").trim().toLowerCase() === email);
  if (!user || selectName(user.fields[fields.memberStatus]) !== "Actif") throw new Error("Accès pilotage non autorisé");

  const role = selectName(user.fields[fields.pilotageRole]);
  if (role === "Tête de réseau") return { email, groupId: null, role: "network", secured: true };
  if (role === "Président") {
    const groupId = firstLinkedRecord(user.fields[fields.ownedGroups]);
    if (!groupId) throw new Error("Aucun groupe n’est associé à ce président");
    return { email, groupId, role: "president", secured: true };
  }
  throw new Error("Accès pilotage non autorisé");
}
