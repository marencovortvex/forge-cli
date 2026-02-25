import type { CompilerTarget } from './target.js';
import { BackendNestjsTarget } from './backend-nestjs.js';
import { WebNextjsTarget } from './web-nextjs.js';

export function defaultTargets(): CompilerTarget[] {
  return [new BackendNestjsTarget(), new WebNextjsTarget()];
}
