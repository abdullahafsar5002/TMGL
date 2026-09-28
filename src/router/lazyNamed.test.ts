import { describe, it, expect } from 'vitest';
import { resolveRouteComponent } from './AppRouter';

const Named = () => null;
const Default = () => null;

describe('resolveRouteComponent', () => {
  it('resolves a named export', () => {
    expect(resolveRouteComponent({ PracticeHubPage: Named }, 'PracticeHubPage')).toBe(Named);
  });

  it('falls back to the default export when the named export is missing', () => {
    expect(resolveRouteComponent({ default: Default }, 'PracticeHubPage')).toBe(Default);
  });

  it('prefers the named export over default', () => {
    expect(resolveRouteComponent({ PracticeHubPage: Named, default: Default }, 'PracticeHubPage')).toBe(Named);
  });

  it('throws a diagnostic error when no usable export exists', () => {
    expect(() => resolveRouteComponent({ somethingElse: 1 }, 'MissingPage')).toThrow(
      /Lazy route export is unavailable: MissingPage\. Module exports: somethingElse/
    );
  });

  it('reports when the module has no exports at all', () => {
    expect(() => resolveRouteComponent({}, 'MissingPage')).toThrow(/Module exports: none/);
  });
});
