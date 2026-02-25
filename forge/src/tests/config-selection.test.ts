import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

import { validateSpecPipeline, compilePipeline } from '../governance/pipeline.js';

async function writeTempSpec(yaml: string) {
  const fs = await import('node:fs/promises');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-spec-'));
  const p = path.join(dir, 'spec.yaml');
  await fs.writeFile(p, yaml, 'utf8');
  return p;
}

const baseYaml = `spec_version: v0
app:
  name: demoapp
  version: 0.0.1
auth:
  mode: email_password
roles: [admin, user]
domain:
  entities:
    User:
      fields:
        id: { type: uuid, primary: true }
        email: { type: email, unique: true, pii: true }
flows:
  - name: create_user
    actor: admin
    steps:
      - action: create
        entity: User
invariants:
  - name: user_email_unique
    kind: database
    rule: "User.email must be unique"
security:
  policies:
    - name: no_pii_in_logs
      kind: logging
      rule: "PII fields must not appear in logs"
deploy:
  cloud: gcp
  runtime: cloud_run
`;

test('spec selection: governance.advisory_providers=[seeded] passes', async () => {
  const specPath = await writeTempSpec(
    baseYaml + `\n\ngovernance:\n  enforcement_mode: standard\n  advisory_providers: ['seeded']\n`
  );
  const res = await validateSpecPipeline(specPath);
  assert.equal(res.ok, true);
});

test('spec selection: unknown advisory provider fails with human error', async () => {
  const specPath = await writeTempSpec(
    baseYaml + `\n\ngovernance:\n  enforcement_mode: standard\n  advisory_providers: ['unknown']\n`
  );
  const res = await validateSpecPipeline(specPath);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('unknown provider')));
});

test('spec selection: governance.targets=[backend-nestjs, web-nextjs] compiles', async () => {
  const specPath = await writeTempSpec(
    baseYaml + `\n\ngovernance:\n  enforcement_mode: standard\n  targets: ['backend-nestjs','web-nextjs']\n`
  );
  const outBase = path.resolve(process.cwd(), '../output');
  process.env.FORGE_BUILD_TIME = '2026-01-01T00:00:00.000Z';
  const res = await compilePipeline({ specPath, outBaseDir: outBase, clean: true });
  assert.equal(res.ok, true);
});

test('spec selection: unknown target fails with human error', async () => {
  const specPath = await writeTempSpec(
    baseYaml + `\n\ngovernance:\n  enforcement_mode: standard\n  targets: ['unknown']\n`
  );
  const outBase = path.resolve(process.cwd(), '../output');
  const res = await compilePipeline({ specPath, outBaseDir: outBase, clean: true });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('unknown target')));
});
