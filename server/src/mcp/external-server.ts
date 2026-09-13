import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as os from 'node:os';

// 🛡️ PIPE DEFENSE: Exit cleanly if parent process closes stdio without throwing uncaught EPIPE
process.stdout.on('error', (err: any) => {
  if (err.code === 'EPIPE') process.exit(0);
});
process.stdin.on('close', () => {
  process.exit(0);
});

// 1. INITIALIZE STANDALONE MCP SERVER
const server = new McpServer({
  name: 'multillm-standalone-mcp-server',
  version: '1.0.0',
});

// 2. REGISTER TOOL 1: Live Server/Host Telemetry
server.tool(
  'get_system_metrics',
  'Get real-time host operating system statistics, CPU architecture, free RAM, memory usage percentage, and system uptime.',
  {},
  async () => {
    const freeMem = Math.round(os.freemem() / 1024 / 1024);
    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const usedMem = totalMem - freeMem;
    const usagePercent = Math.round((usedMem / totalMem) * 100);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              platform: os.platform(),
              arch: os.arch(),
              uptimeSeconds: Math.round(os.uptime()),
              freeMemoryMB: `${freeMem} MB`,
              totalMemoryMB: `${totalMem} MB`,
              memoryUsagePercent: `${usagePercent}%`,
              nodeVersion: process.version,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 3. REGISTER TOOL 2: Clean URL Inspector
server.tool(
  'fetch_webpage',
  'Safely fetch any external HTTP/HTTPS URL and extract cleaned text content for analysis.',
  {
    url: z.string().describe('The web URL to fetch and inspect (e.g., "https://example.com")'),
  },
  async ({ url }) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MULTILLM-MCP-Worker/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const html = await res.text();
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);

      return {
        content: [
          {
            type: 'text',
            text: cleanText,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to fetch URL: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 4. CONNECT TO STDIO TRANSPORT
const transport = new StdioServerTransport();
await server.connect(transport);
