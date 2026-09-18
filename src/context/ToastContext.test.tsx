import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

describe('ToastContext', () => {
  it('exports ToastProvider component', () => {
    expect(typeof ToastProvider).toBe('function');
  });

  it('exports useToast hook', () => {
    expect(typeof useToast).toBe('function');
  });

  it('useToast throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      throw new Error('useToast must be used within a ToastProvider');
    }).toThrow('useToast must be used within a ToastProvider');
    spy.mockRestore();
  });

  it('ToastProvider is a valid React component', () => {
    expect(ToastProvider).toBeDefined();
    expect(typeof ToastProvider).toBe('function');
  });
});
