export class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = 'HttpError'; this.status = status; }
}
/** Same-origin client; errors stay readable even when a proxy/network fails before JSON arrives. */
export async function requestJson<T>(url: string, init?: RequestInit, fetcher: typeof fetch = fetch): Promise<T> {
  let response: Response;
  try { response = await fetcher(url, init); }
  catch {
    throw new Error(init?.signal?.aborted ? 'The request was cancelled. You can run it again.'
      : 'Could not reach the server. Check your connection and retry.');
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch {
    if (!response.ok) throw new HttpError(`The server could not complete the request (HTTP ${response.status}). Please retry.`, response.status);
    throw new Error('The server returned an unreadable response. Please retry.');
  }
  if (!response.ok) {
    const failure = payload && typeof payload === 'object' && 'error' in payload ? payload.error : null;
    if (failure && typeof failure === 'object' && 'message' in failure && typeof failure.message === 'string') {
      const details = 'details' in failure && Array.isArray(failure.details) ? failure.details : [];
      const messages = details.flatMap(detail => detail && typeof detail === 'object' &&
        typeof detail.path === 'string' && typeof detail.message === 'string' ? [`${detail.path}: ${detail.message}`] : []);
      throw new HttpError([failure.message, ...messages].join(' '), response.status);
    }
    throw new HttpError(`The server could not complete the request (HTTP ${response.status}). Please retry.`, response.status);
  }
  return payload as T;
}
