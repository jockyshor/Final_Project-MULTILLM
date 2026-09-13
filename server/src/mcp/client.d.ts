/**
 * Connects to our dedicated background MCP Server process via Stdio Transport.
 * Environment-aware: runs via tsx in local development, and via node on dist/ in production Docker.
 */
export declare function initMcpClient(): Promise<Record<string, any>>;
//# sourceMappingURL=client.d.ts.map