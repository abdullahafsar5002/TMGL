import { describe, it, expect } from 'vitest';
import { resolvePageExport } from './pageLoader';

const Named = () => null;
const Default = () => null;

describe('resolvePageExport', () => {
  it('resolves a named export', () => {
    expect(resolvePageExport({ PracticeHubPage: Named }, 'PracticeHubPage')).toBe(Named);
  });

  it('falls back to the default export when the named export is missing', () => {
    expect(resolvePageExport({ default: Default }, 'PracticeHubPage')).toBe(Default);
  });

  it('prefers the named export over default', () => {
    expect(resolvePageExport({ PracticeHubPage: Named, default: Default }, 'PracticeHubPage')).toBe(Named);
  });

  it('throws a diagnostic error when no usable export exists', () => {
    expect(() => resolvePageExport({ somethingElse: 1 }, 'MissingPage')).toThrow(
      /Lazy route export is unavailable: MissingPage\. Module exports: somethingElse/
    );
  });

  it('reports when the module has no exports at all', () => {
    expect(() => resolvePageExport({}, 'MissingPage')).toThrow(/Module exports: none/);
  });
});
