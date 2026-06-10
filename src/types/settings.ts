export interface PassKeyInfo {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface McpTokenInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}
