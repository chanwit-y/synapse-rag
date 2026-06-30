/** A file in a SharePoint folder, as shown in the import modal. */
export interface SharePointFileEntry {
  name: string;
  /** Server-relative URL, used to download the file. */
  serverRelativeUrl: string;
  /** Size in bytes. */
  size: number;
  modifiedAt: string | null;
  /** Whether the file's extension is one we can extract text from. */
  supported: boolean;
}

/** A file the import skipped, with a human-readable reason. */
export interface SharePointSkip {
  name: string;
  reason: string;
}

export interface SharePointImportResult {
  collectionId: string;
  collectionName: string;
  /** New documents created. */
  imported: number;
  /** Existing documents (matched by name) overwritten. */
  updated: number;
  /** Files skipped, with reasons (unsupported type, too large, empty, error). */
  skipped: SharePointSkip[];
}

export interface SharePointImportParams {
  /** Site path, e.g. `/sites/Team`. */
  site: string;
  /** Server-relative URL of the folder, e.g. `/sites/Team/Shared Documents/drop`. */
  folderServerRelativeUrl: string;
  /** Server-relative URLs of the files the user selected to import. */
  selectedUrls: string[];
  /** Import into this existing collection (mutually exclusive with newCollectionName). */
  collectionId?: string | null;
  /** Create a new collection with this name (defaults to the folder leaf name). */
  newCollectionName?: string | null;
  /** Optional target sub-folder within the collection. */
  folderId?: string | null;
}
