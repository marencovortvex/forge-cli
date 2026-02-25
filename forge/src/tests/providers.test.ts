import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

import { compilePipeline } from '../governance/pipeline.js';
import { SeededAdvisoryProvider } from '../policy/advisories/seeded.js';

test('pipeline: seeded advisory provider contributes advisories to policy report', async () => {
  process.env.FORGE_BUILD_TIME = '2026-01-01T00:00:00.000Z';

  const specPath = path.resolve(process.cwd(), '../examples/demoapp.yaml');
  const fs = await import('node:fs/promises');
  const tmpOut = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-out-'));

  const res = await compilePipeline({
    specPath,
    outBaseDir: tmpOut,
    clean: true,
    advisoryProviders: [new SeededAdvisoryProvider()]
  });

  assert.equal(res.ok, true);
  const reportRaw = await fs.readFile(res.policyReportPath!, 'utf8');
  const report = JSON.parse(reportRaw);

  assert.ok(Array.isArray(report.advisories));
  assert.ok(report.advisories.length >= 1);
  assert.equal(report.advisories[0].source, 'seeded');
});
