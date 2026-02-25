import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { verifyFromSpecFile } from '../verify.js';

test('strict mode: high advisory becomes deploy blocker and verify fails', async () => {
  process.env.FORGE_BUILD_TIME = '2026-01-01T00:00:00.000Z';

  const specPath = path.resolve(process.cwd(), '../examples/strict-blocker.yaml');
  const outBase = path.resolve(process.cwd(), '../output');

  const res = await verifyFromSpecFile(specPath, outBase);
  assert.equal(res.ok, false);
  const joined = res.errors.join('\n');
  assert.ok(joined.includes('Deploy blockers present'), `expected blockers error, got:\n${joined}`);
});
