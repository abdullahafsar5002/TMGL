export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error === 'object' && error !== null) {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export function toUserFacingServiceError(error: unknown, fallback: string): string {
  const message = getErrorMessage(error, fallback);
  if (/row[- ]level security|rls|not authorized|permission denied|forbidden|401|403/i.test(message)) {
    return 'You do not have permission to perform this action. Ask a league manager to check your access.';
  }
  if (/invalid login|authentication|unauthorized/i.test(message)) {
    return 'Your session is no longer valid. Sign in again and retry.';
  }
  return message;
}

export function isRetryableServiceError(error: unknown): boolean {
  const message = getErrorMessage(error, '').toLowerCase();
  return /network|offline|connection|timeout|timed out|fetch|502|503|504|temporarily unavailable/.test(message);
}
