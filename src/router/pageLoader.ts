import { lazy } from 'react';
import type { ComponentType } from 'react';

type PageModule = Record<string, unknown>;

export function resolvePageExport(module: PageModule, name: string): ComponentType {
  const component = module[name] ?? module.default;
  if (!component) {
    const available = Object.keys(module).join(', ') || 'none';
    throw new Error(`Lazy route export is unavailable: ${name}. Module exports: ${available}`);
  }
  return component as ComponentType;
}

export function lazyNamed(importFn: () => Promise<PageModule>, name: string) {
  return lazy(() => importFn().then((module) => ({ default: resolvePageExport(module, name) })));
}
