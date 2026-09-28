import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(SRC).filter((file) => /\.tsx?$/.test(file));

function collectRoutes(): string[] {
  const router = readFileSync(join(SRC, 'router', 'AppRouter.tsx'), 'utf8');
  return [...router.matchAll(/path="([^"]+)"/g)].map((match) => match[1]).filter((path) => path !== '*');
}

function toMatcher(path: string): RegExp {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  let pattern = '^';
  for (const segment of segments) {
    if (segment === '*') {
      pattern += '(?:/.*)?';
      continue;
    }
    if (segment.startsWith(':') && segment.endsWith('?')) {
      pattern += '(?:/[^/]+)?';
      continue;
    }
    if (segment.startsWith(':')) {
      pattern += '/[^/]+';
      continue;
    }
    pattern += `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
  }
  return new RegExp(`${pattern}/?$`);
}

function collectLinks(): Array<{ file: string; link: string }> {
  const found: Array<{ file: string; link: string }> = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const patterns = [
      /\bto="(\/[^"]*)"/g,
      /\bto=\{`(\/[^`]*)`\}/g,
      /\bnavigate\(`(\/[^`]*)`\)/g,
      /\bnavigate\("(\/[^"]*)"\)/g,
      /\bnavigate\('(\/[^']*)'\)/g,
      /\bhref="(\/[^"]*)"/g,
    ];
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        found.push({ file: file.replace(`${process.cwd()}\\`, ''), link: match[1] });
      }
    }
  }
  return found;
}

function normalize(link: string): string {
  return link
    .replace(/\$\{[^}]*\}/g, 'param')
    .split('#')[0]
    .split('?')[0]
    .replace(/\/+$/, '') || '/';
}

describe('route consistency', () => {
  const routes = collectRoutes();
  const matchers = routes.map(toMatcher);

  it('registers routes and links', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(collectLinks().length).toBeGreaterThan(20);
  });

  it('every internal link resolves to a registered route', () => {
    const orphans = collectLinks()
      .map(({ file, link }) => ({ file, link: normalize(link) }))
      .filter(({ link }) => !link.startsWith('/assets/'))
      .filter(({ link }) => !matchers.some((matcher) => matcher.test(link)));

    const unique = Array.from(new Map(orphans.map((item) => [`${item.file}::${item.link}`, item])).values());
    expect(unique).toEqual([]);
  });
});
