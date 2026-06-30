export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure-openai"
  | "microsoft-foundry"
  | "azure-devops"
  | "sharepoint"
  | "other";

export type ApiKeyStatus = "active" | "inactive";

export type ApiKeyRecord = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  keyMasked: string;
  /**
   * For Microsoft Foundry: OpenAI-compatible base URL. For SharePoint: the
   * site host (e.g. `https://contoso.sharepoint.com`). Null otherwise.
   */
  endpoint: string | null;
  /** Azure `api-version` (Microsoft Foundry); null otherwise. */
  apiVersion: string | null;
  /** Azure AD / ACS tenant id (SharePoint); null otherwise. */
  tenantId: string | null;
  /** App (client) id (SharePoint); null otherwise. */
  clientId: string | null;
  /** Default SharePoint site path the import modal pre-fills; null otherwise. */
  sitePath: string | null;
  /** Default SharePoint folder server-relative URL; null otherwise. */
  folderPath: string | null;
  status: ApiKeyStatus;
  updatedAt: string;
};

export type ApiKeyFormValues = {
  name: string;
  provider: ApiKeyProvider;
  /** Secret value: API key, or the SharePoint app client secret. */
  apiKey: string;
  /**
   * For Microsoft Foundry: endpoint URL (required). For SharePoint: site host
   * (required), e.g. `https://contoso.sharepoint.com`.
   */
  endpoint?: string;
  /** Azure `api-version`, optional for Microsoft Foundry (defaults server-side). */
  apiVersion?: string;
  /** Azure AD / ACS tenant id, required for SharePoint. */
  tenantId?: string;
  /** App (client) id, required for SharePoint. */
  clientId?: string;
  /** Default SharePoint site path the import modal pre-fills (optional). */
  sitePath?: string;
  /** Default SharePoint folder server-relative URL (optional). */
  folderPath?: string;
  active: boolean;
};

