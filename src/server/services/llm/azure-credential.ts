import { ServiceError } from "../utils";

/** Entra ID scope for Azure AI Foundry / Azure OpenAI data-plane access. */
const FOUNDRY_SCOPE = "https://ai.azure.com/.default";

/**
 * Lazily-built, module-level bearer-token provider for Microsoft Foundry.
 * `@azure/identity` is imported on first use so it is never loaded for
 * API-key-only deployments. `getBearerTokenProvider` caches the token
 * internally until it nears expiry, so calling the returned provider per
 * request does not re-authenticate every time.
 *
 * On a non-Azure host, `DefaultAzureCredential` resolves from the standard
 * `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` env vars
 * (service principal) or a managed identity.
 */
let tokenProviderPromise: Promise<() => Promise<string>> | null = null;

async function getTokenProvider(): Promise<() => Promise<string>> {
  if (!tokenProviderPromise) {
    tokenProviderPromise = (async () => {
      const { DefaultAzureCredential, getBearerTokenProvider } = await import(
        "@azure/identity"
      );
      return getBearerTokenProvider(
        new DefaultAzureCredential(),
        FOUNDRY_SCOPE,
      );
    })().catch((error) => {
      // Reset so a transient import/credential failure can be retried later.
      tokenProviderPromise = null;
      throw error;
    });
  }
  return tokenProviderPromise;
}

/**
 * Mint an Entra ID access token for Microsoft Foundry. Used when a Foundry
 * API key row has no static key value (token-auth mode).
 */
export async function getFoundryToken(): Promise<string> {
  try {
    const provider = await getTokenProvider();
    const token = await provider();
    if (!token) {
      throw new Error("Empty token");
    }
    return token;
  } catch (error) {
    throw new ServiceError(
      `Failed to acquire an Entra ID token for Microsoft Foundry. Ensure @azure/identity is installed and AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET (or a managed identity) are configured. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "DEPENDENCY",
    );
  }
}
