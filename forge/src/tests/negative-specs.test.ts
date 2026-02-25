import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { validateSpecFile } from '../validate.js';

async function expectFail(specRelPath: string, contains: string) {
  const specPath = path.resolve(process.cwd(), specRelPath);
  const res = await validateSpecFile(specPath);
  assert.equal(res.ok, false);
  const joined = res.errors.join('\n');
  assert.ok(joined.includes(contains), `expected error to include: ${contains}\nGot:\n${joined}`);
}

test('negative: invalid role (actor not in roles)', async () => {
  await expectFail('../examples/invalid-role.yaml', "flow.actor 'admin' must exist in roles");
});

test('negative: missing pii policy', async () => {
  await expectFail('../examples/missing-policy.yaml', 'pii:true fields require');
});

test('negative: invalid flow entity reference', async () => {
  await expectFail('../examples/invalid-flow.yaml', "references unknown entity 'MissingEntity'");
});
