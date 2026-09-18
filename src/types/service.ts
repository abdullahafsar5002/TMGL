export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string };
