import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// 1. DEFINE SANDBOX BOUNDARY (Project Root)
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PROTECTED_PATTERNS = ['.env', '.git', 'node_modules'];

function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, targetPath);
  if (!resolved.startsWith(PROJECT_ROOT)) return false;
  return !PROTECTED_PATTERNS.some(pattern => resolved.includes(pattern));
}

// 2. EXPORT MCP TOOLS FOR THE CODE SPECIALIST
export const projectTools = {
  list_directory: tool({
    description: 'List files and directories within a given project folder to explore the codebase structure.',
    parameters: z.object({
      directoryPath: z.string().optional().describe('Relative folder path from project root (e.g., "." or "server/src")'),
    }),
    execute: async (args: any) => {
      const dirPath = args?.directoryPath || '.';
      console.log(`🔧 [Tool Execution] list_directory("${dirPath}")`);

      if (!isPathSafe(dirPath)) {
        return { error: 'Access Denied: Path is outside project sandbox.' };
      }

      const fullPath = path.resolve(PROJECT_ROOT, dirPath);

      try {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        return {
          path: dirPath,
          entries: entries
            .filter(e => !PROTECTED_PATTERNS.includes(e.name))
            .map(e => ({
              name: e.name,
              isDirectory: e.isDirectory(),
            })),
        };
      } catch (err: any) {
        return { error: `Failed to read directory: ${err.message}` };
      }
    },
  } as any),

  read_file: tool({
    description: 'Read the text content of a source file within the project.',
    parameters: z.object({
      filePath: z.string().describe('Relative path to the file from project root (e.g., "server/package.json")'),
    }),
    execute: async (args: any) => {
      // Defensive parameter resolution: handles filePath, path, file
      const rawPath = args?.filePath || args?.path || args?.file || 'server/package.json';
      console.log(`🔧 [Tool Execution] read_file("${rawPath}")`);

      if (!isPathSafe(rawPath)) {
        return { error: 'Access Denied: Path is outside project sandbox or accesses protected files (.env).' };
      }

      const fullPath = path.resolve(PROJECT_ROOT, rawPath);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const truncated = content.length > 8000 ? content.slice(0, 8000) + '\n...[Truncated]' : content;
        return {
          filePath: rawPath,
          content: truncated,
        };
      } catch (err: any) {
        return { error: `Failed to read file "${rawPath}": ${err.message}` };
      }
    },
  } as any),
};