import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { tool } from 'ai';
import { z } from 'zod';
import * as path from 'node:path';

let mcpClient: Client | null = null;

/**
 * Connects to our dedicated background MCP Server process via Stdio Transport.
 * Environment-aware: runs via tsx in local development, and via node on dist/ in production Docker.
 */
export async function initMcpClient(): Promise<Record<string, any>> {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // 🛡️ DOCKER COMPATIBILITY: In production Docker, use compiled dist/ JS. In dev, use src/ TS.
    const serverScriptPath = isProduction
      ? path.resolve(process.cwd(), 'dist/mcp/external-server.js')
      : path.resolve(process.cwd(), 'src/mcp/external-server.ts');

    console.log(`🔌 [MCP Client] Spawning MCP server [Env: ${isProduction ? 'PRODUCTION (dist)' : 'DEVELOPMENT (src)'}]`);

    const transport = new StdioClientTransport({
      command: isProduction ? 'node' : 'npx',
      args: isProduction ? [serverScriptPath] : ['tsx', serverScriptPath],
    });

    mcpClient = new Client(
      {
        name: 'multillm-express-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await mcpClient.connect(transport);
    console.log('✅ [MCP Client] Connected to standalone MCP Server via JSON-RPC.');

    // 1. Dynamic MCP Tool Discovery
    const { tools: remoteTools } = await mcpClient.listTools();
    console.log(
      `🔍 [MCP Discovery] Discovered ${remoteTools.length} remote MCP tools:`,
      remoteTools.map((t) => t.name)
    );

    // 2. Bridge Remote MCP Tools into AI SDK format
    const bridgedTools: Record<string, any> = {};

    for (const remoteTool of remoteTools) {
      bridgedTools[remoteTool.name] = tool({
        description: `[Remote MCP Tool] ${remoteTool.description || 'External tool provided via Model Context Protocol'}`,
        parameters: z.object({
          url: z.string().optional().describe('URL parameter if fetching web content'),
        }).passthrough(),
        execute: async (args: any) => {
          console.log(`📡 [MCP Dispatch] Calling remote MCP tool: ${remoteTool.name}`, args);
          try {
            const result = await mcpClient!.callTool({
              name: remoteTool.name,
              arguments: args,
            });
            return result;
          } catch (err: any) {
            console.error(`❌ [MCP Error] Failed to execute ${remoteTool.name}:`, err);
            return { error: `MCP execution failure: ${err.message}` };
          }
        },
      } as any);
    }

    return bridgedTools;
  } catch (err: any) {
    console.warn(`⚠️ [MCP Warning] Could not initialize MCP Server: ${err.message}. Continuing with local tools.`);
    return {};
  }
}