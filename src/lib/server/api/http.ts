import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { ApiErrorSchema } from '../schemas.ts';

type Detail = { path: string; message: string };
class InputError extends Error {
  readonly status: 400 | 422;
  readonly code: string;
  readonly details: Detail[];
  constructor(status: 400 | 422, code: string, details: Detail[]) {
    super(status === 400 ? 'Request body must be valid JSON.' : 'Request validation failed.');
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const pointer = (path: PropertyKey[]) => path.length === 0 ? '' : '/' + path.map(part =>
  String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');

/** Only incoming request validation gets a 4xx; output/fixture schema failures are internal errors. */
export async function readApiInput<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let input: unknown;
  try { input = await request.json(); }
  catch { throw new InputError(400, 'INVALID_JSON', []); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new InputError(422, 'VALIDATION_ERROR', parsed.error.issues.map(issue => ({
    path: pointer(issue.path), message: issue.message,
  })));
  return parsed.data;
}

export function apiError(status: number, code: string, message: string, details: Detail[] = []) {
  return json(ApiErrorSchema.parse({ error: { code, message, details } }), {
    status, headers: { 'cache-control': 'no-store' },
  });
}

/** Route adapters call real loaders/engines and serialize validated outputs; no financial formulas. */
export async function apiResponse<T>(operation: () => T | Promise<T>, logError: (error: unknown) => void = console.error) {
  try { return json(await operation(), { headers: { 'cache-control': 'no-store' } }); }
  catch (error) {
    if (error instanceof InputError) return apiError(error.status, error.code, error.message, error.details);
    logError(error);
    return apiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
  }
}

/** Normalize framework 4xx/5xx responses for API consumers, preserving useful HTTP headers. */
export async function normalizeApiError(response: Response): Promise<Response> {
  if (response.status < 400) return response;
  try {
    const existing = ApiErrorSchema.safeParse(await response.clone().json());
    if (existing.success && response.status < 500) return response;
  } catch { /* Framework errors may use HTML; never forward their details into API bodies. */ }
  const status = response.status;
  const code = status >= 500 ? 'INTERNAL_ERROR' : status === 404 ? 'NOT_FOUND' : status === 405 ? 'METHOD_NOT_ALLOWED' : 'HTTP_ERROR';
  const message = status >= 500 ? 'The request could not be completed.'
    : status === 404 ? 'API endpoint not found.' : status === 405 ? 'Method not allowed.' : 'The request was rejected.';
  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json');
  headers.set('cache-control', 'no-store');
  headers.delete('content-length');
  headers.delete('content-encoding');
  return json(ApiErrorSchema.parse({ error: { code, message, details: [] } }), { status, headers });
}
