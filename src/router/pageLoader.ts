import { lazy } from 'react';
import type { ComponentType } from 'react';

type PageModule = Record<string, unknown>;

export function resolvePageExport(module: PageModule, name: string): ComponentType {
  const component = module[name] ?? module.default;
  if (!component) {
    throw new Error(`Page module does not export ${name}`);
  }
  return component as ComponentType;
}

export function lazyNamed(importFn: () => Promise<PageModule>, name: string) {
  return lazy(() => importFn().then((module) => ({ default: resolvePageExport(module, name) })));
}
