import type { Handle } from '@sveltejs/kit/hooks';
import { apiResponse, normalizeApiError } from './lib/server/api/http.ts';

/** Keep API errors structured while preserving the existing page response behavior. */
export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  if (!/^\/api\/v[12](\/|$)/.test(path)) return resolve(event);
  try { return await normalizeApiError(await resolve(event)); }
  catch (error) { return apiResponse(() => { throw error; }); }
};
