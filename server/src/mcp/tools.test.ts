import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { isPathSafe } from './tools.js';

describe('MCP Filesystem Sandbox: isPathSafe Security Boundary', () => {
  it('should PERMIT legitimate files inside the project boundary', () => {
    expect(isPathSafe('package.json')).toBe(true);
    expect(isPathSafe('server/package.json')).toBe(true);
    expect(isPathSafe('client/src/App.tsx')).toBe(true);
  });

  it('should PERMIT legitimate nested source directories', () => {
    expect(isPathSafe('server/src')).toBe(true);
    expect(isPathSafe('client/src')).toBe(true);
  });

  it('should STRICTLY BLOCK directory traversal attacks (../../../../etc/passwd)', () => {
    expect(isPathSafe('../../../../etc/passwd')).toBe(false);
    expect(isPathSafe('../../etc/shadow')).toBe(false);
    expect(isPathSafe('../../../Windows/System32/config/SAM')).toBe(false);
  });

  it('should STRICTLY BLOCK access to .env secrets', () => {
    expect(isPathSafe('.env')).toBe(false);
    expect(isPathSafe('server/.env')).toBe(false);
    expect(isPathSafe('server/.env.local')).toBe(false);
    expect(isPathSafe('.env.production')).toBe(false);
  });

  it('should STRICTLY BLOCK access to internal metadata (.git, node_modules)', () => {
    expect(isPathSafe('.git/config')).toBe(false);
    expect(isPathSafe('.git/HEAD')).toBe(false);
    expect(isPathSafe('node_modules/express/package.json')).toBe(false);
    expect(isPathSafe('server/node_modules')).toBe(false);
  });

  it('should reject tricky relative escapes attempting to resolve back in', () => {
    const maliciousTraverse = path.join('..', '..', '..', 'etc', 'hosts');
    expect(isPathSafe(maliciousTraverse)).toBe(false);
  });
});