import { apiKeyRepository } from "@/server/db/repository";
import { ServiceError } from "../utils";

/** The fixed SharePoint Online principal id used in the ACS resource string. */
const SHAREPOINT_PRINCIPAL = "00000003-0000-0ff1-ce00-000000000000";
/** Refresh the cached token this many ms before it actually expires. */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export interface SharePointAuth {
  /** Site host origin, e.g. `https://contoso.sharepoint.com`. */
  host: string;
  /** Host only, e.g. `contoso.sharepoint.com` (used in the ACS resource). */
  hostname: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface SharePointFile {
  name: string;
  /** Server-relative URL, e.g. `/sites/Team/Shared Documents/file.pdf`. */
  serverRelativeUrl: string;
  /** Size in bytes. */
  size: number;
  modifiedAt: string | null;
}

/**
 * Resolve SharePoint auth from the single active `sharepoint` API key (managed
 * in Settings → SharePoint). The client secret lives in `keyValue`; host,
 * tenant id and client id live on the key row. Most-recently-updated wins.
 */
export async function resolveSharePointAuth(): Promise<SharePointAuth> {
  const [key] = await apiKeyRepository.findActiveByProvider("sharepoint");
  if (!key) {
    throw new ServiceError(
      "No active SharePoint connection. Add one in Settings → SharePoint.",
      "DEPENDENCY",
    );
  }

  const host = key.endpoint?.trim().replace(/\/+$/, "");
  const tenantId = key.tenantId?.trim();
  const clientId = key.clientId?.trim();
  const clientSecret = key.keyValue?.trim();

  if (!host || !tenantId || !clientId || !clientSecret) {
    throw new ServiceError(
      "SharePoint connection is incomplete. Check the host, tenant id, client id and secret in Settings → SharePoint.",
      "DEPENDENCY",
    );
  }

  let hostname: string;
  try {
    hostname = new URL(host).host;
  } catch {
    throw new ServiceError(
      "SharePoint site host is not a valid URL.",
      "DEPENDENCY",
    );
  }

  return { host, hostname, tenantId, clientId, clientSecret };
}

interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

function cacheKey(auth: SharePointAuth): string {
  return `${auth.tenantId}|${auth.clientId}|${auth.hostname}`;
}

/**
 * Acquire an ACS app-only bearer token for SharePoint via the
 * `accounts.accesscontrol.windows.net` token endpoint (the SharePoint add-in /
 * app-only flow). Tokens are cached in-memory until shortly before expiry.
 */
export async function getSharePointToken(auth: SharePointAuth): Promise<string> {
  const key = cacheKey(auth);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const url = `https://accounts.accesscontrol.windows.net/${encodeURIComponent(
    auth.tenantId,
  )}/tokens/OAuth/2`;
  // The ACS client_id is `<appId>@<tenantId>`. Accept either the bare app id or
  // an already realm-suffixed value (strip an existing `@...` so we don't double it).
  const bareClientId = auth.clientId.split("@")[0];
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: `${bareClientId}@${auth.tenantId}`,
    client_secret: auth.clientSecret,
    resource: `${SHAREPOINT_PRINCIPAL}/${auth.hostname}@${auth.tenantId}`,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      `SharePoint token request failed (${res.status}): ${text.slice(0, 300)}`,
      "DEPENDENCY",
    );
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: string;
    expires_on?: string;
  };
  if (!data.access_token) {
    throw new ServiceError("SharePoint token response had no access_token.", "DEPENDENCY");
  }

  // Prefer the absolute `expires_on` (seconds since epoch); fall back to `expires_in`.
  const expiresOnMs = data.expires_on ? Number(data.expires_on) * 1000 : null;
  const expiresInMs = data.expires_in ? Number(data.expires_in) * 1000 : null;
  const expiresAt =
    (expiresOnMs && Number.isFinite(expiresOnMs)
      ? expiresOnMs
      : Date.now() + (expiresInMs && Number.isFinite(expiresInMs) ? expiresInMs : 3600_000)) -
    TOKEN_EXPIRY_BUFFER_MS;

  tokenCache.set(key, { token: data.access_token, expiresAt });
  return data.access_token;
}

/** Normalize a site path to a leading-slash, no-trailing-slash form, e.g. `/sites/Team`. */
export function normalizeSitePath(site: string): string {
  const trimmed = site.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    throw new ServiceError("A SharePoint site path is required.", "VALIDATION");
  }
  return `/${trimmed}`;
}

/** Build the `_api/web` base URL for a site, e.g. `https://host/sites/Team/_api/web`. */
function apiBase(auth: SharePointAuth, sitePath: string): string {
  return `${auth.host}${sitePath}/_api/web`;
}

/**
 * Encode a server-relative URL for use inside a `GetXByServerRelativeUrl('...')`
 * call: encode each segment (so spaces → %20) but keep the `/` separators
 * literal, and double single quotes for the OData string literal. A trailing
 * slash is stripped (it makes the folder lookup 404).
 */
function quotePath(path: string): string {
  return path
    .replace(/\/+$/, "")
    .split("/")
    .map((seg) => encodeURIComponent(seg).replace(/'/g, "''"))
    .join("/");
}

async function spFetch(
  auth: SharePointAuth,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getSharePointToken(auth);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      `SharePoint request failed (${res.status}): ${text.slice(0, 300)}`,
      res.status === 401 || res.status === 403 ? "DEPENDENCY" : "VALIDATION",
    );
  }
  return res;
}

/**
 * List the files directly inside a folder (no recursion).
 * `folderServerRelativeUrl` is e.g. `/sites/Team/Shared Documents/ai-drop-zone`.
 */
export async function listFolderFiles(
  auth: SharePointAuth,
  sitePath: string,
  folderServerRelativeUrl: string,
): Promise<SharePointFile[]> {
  const url =
    `${apiBase(auth, sitePath)}/GetFolderByServerRelativeUrl('${quotePath(folderServerRelativeUrl)}')/Files` +
    `?$select=Name,ServerRelativeUrl,Length,TimeLastModified`;

  const res = await spFetch(auth, url);
  const data = (await res.json()) as {
    value?: Array<{
      Name?: string;
      ServerRelativeUrl?: string;
      Length?: string | number;
      TimeLastModified?: string;
    }>;
  };

  return (data.value ?? [])
    .filter((f) => f.Name && f.ServerRelativeUrl)
    .map((f) => ({
      name: f.Name as string,
      serverRelativeUrl: f.ServerRelativeUrl as string,
      size: Number(f.Length ?? 0) || 0,
      modifiedAt: f.TimeLastModified ?? null,
    }));
}

/**
 * Download a file's bytes by its server-relative URL. Validates the received
 * length against `Content-Length` and retries on an empty/truncated read
 * (SharePoint's `$value` stream occasionally returns a short body on reused
 * connections); throws a clear error if it can't get the full file.
 */
export async function downloadFile(
  auth: SharePointAuth,
  sitePath: string,
  fileServerRelativeUrl: string,
): Promise<Buffer> {
  const url = `${apiBase(auth, sitePath)}/GetFileByServerRelativeUrl('${quotePath(fileServerRelativeUrl)}')/$value`;

  let lastInfo = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    // A binary Accept header: with `application/json` the $value stream can come
    // back empty. `cache: no-store` avoids a poisoned cached/keep-alive body.
    const res = await spFetch(auth, url, {
      headers: { Accept: "*/*" },
      cache: "no-store",
    });
    const expected = Number(res.headers.get("content-length") ?? "0");
    const buf = Buffer.from(await res.arrayBuffer());

    if (buf.length > 0 && (expected === 0 || buf.length === expected)) {
      return buf;
    }
    lastInfo = `${buf.length}/${expected || "?"} bytes`;
    // Brief backoff before retrying.
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }

  throw new ServiceError(
    `SharePoint returned an empty/truncated download (${lastInfo}).`,
    "DEPENDENCY",
  );
}
