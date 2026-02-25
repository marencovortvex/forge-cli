import type { AdvisoryProvider } from '../policy/advisories/provider.js';
import { SeededAdvisoryProvider } from '../policy/advisories/seeded.js';

import type { PolicyRuleset } from '../policy/ruleset.js';
import { DefaultRuleset } from '../policy/defaultRuleset.js';

import type { CompilerTarget } from '../compiler/targets/target.js';
import { BackendNestjsTarget } from '../compiler/targets/backend-nestjs.js';
import { WebNextjsTarget } from '../compiler/targets/web-nextjs.js';

export function defaultAdvisoryProviders(): AdvisoryProvider[] {
  return [new SeededAdvisoryProvider()];
}

export function defaultRuleset(): PolicyRuleset {
  return new DefaultRuleset();
}

export function defaultTargets(): CompilerTarget[] {
  return [new BackendNestjsTarget(), new WebNextjsTarget()];
}

export function advisoryProviderRegistry() {
  const providers = defaultAdvisoryProviders();
  return new Map(providers.map((p) => [p.id, p] as const));
}

export function targetRegistry() {
  const targets = defaultTargets();
  return new Map(targets.map((t) => [t.id, t] as const));
}
