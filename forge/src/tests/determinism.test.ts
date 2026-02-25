import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { compileFromSpecFile } from '../compile.js';

async function hashDir(dir: string): Promise<string> {
  const files: string[] = [];
  async function walk(p: string) {
    const entries = await fs.readdir(p, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) await walk(full);
      else files.push(full);
    }
  }
  await walk(dir);
  files.sort();

  const h = crypto.createHash('sha256');
  for (const f of files) {
    const rel = path.relative(dir, f);
    h.update(rel);
    h.update('\0');
    h.update(await fs.readFile(f));
    h.update('\0');
  }
  return h.digest('hex');
}

test('compile --clean is deterministic (tree hash matches)', async () => {
  // Fix build time to make artifacts deterministic.
  process.env.FORGE_BUILD_TIME = '2026-01-01T00:00:00.000Z';

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-det-'));
  const outBase = path.join(tmp, 'out');
  await fs.mkdir(outBase, { recursive: true });

  const specPath = path.resolve(process.cwd(), '../examples/demoapp.yaml');

  const r1 = await compileFromSpecFile(specPath, outBase, { clean: true });
  assert.equal(r1.ok, true);
  const outDir = r1.outputDir!;

  const h1 = await hashDir(outDir);

  const r2 = await compileFromSpecFile(specPath, outBase, { clean: true });
  assert.equal(r2.ok, true);

  const h2 = await hashDir(outDir);

  assert.equal(h2, h1);
});
