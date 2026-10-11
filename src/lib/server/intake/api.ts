import { z } from 'zod';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { apiError } from '../api/http.ts';
import { ProfileStore } from './store.ts';
import { intakeTemplate } from './template.ts';
import { assessIntake } from './eligibility.ts';
import { ProfilePayloadSchema, ProfileSimulationInputSchema } from './schemas.ts';
import { importWorkbook } from './import.ts';
import { ImportFailure } from './xlsx.ts';

const cookie = 'operatoros_intake_session';
const revision = z.number().int().min(1).max(200);
const save = z.strictObject({ revision, profile: ProfilePayloadSchema });
const transition = z.strictObject({ revision });
class RequestFailure extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
async function bytes(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestFailure(400, 'Request body is missing.');
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > 1024 * 1024) { await reader.cancel(); throw new RequestFailure(413, 'Intake requests are limited to 1 MB.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function input(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RequestFailure(415, 'Use JSON for this request.');
  try { return JSON.parse((await bytes(request)).toString('utf8')); }
  catch (e) { if (e instanceof RequestFailure) throw e; throw new RequestFailure(400, 'Request body must be valid JSON.'); }
}
type Event = Pick<RequestEvent, 'request' | 'url' | 'cookies'>;
export function intakeApi(store: ProfileStore) {
  return async (event: Event) => {
    try {
      const { request, url, cookies } = event;
      const parts = url.pathname.replace(/^\/api\/v2\/intake\/?/, '').split('/').filter(Boolean);
      const method = request.method;
      if (method !== 'GET' && request.headers.get('origin') !== url.origin) throw new RequestFailure(403, 'Use this application to change an intake.');
      let owner = store.authenticate(cookies.get(cookie));
      if (parts[0] === 'session' && parts.length === 1 && method === 'POST') {
        if (!owner) {
          const session = store.createSession(); owner = session.owner;
          cookies.set(cookie, session.token, { path: '/', httpOnly: true, sameSite: 'strict', secure: url.protocol === 'https:', maxAge: 30 * 86400 });
        }
        return json({ ready: true }, { headers: { 'cache-control': 'no-store' } });
      }
      if (!owner) throw new RequestFailure(401, 'Start an intake session in this browser first.');
      let result: unknown;
      if (parts[0] === 'import' && method === 'POST' && parts.length === 1) {
        if (request.headers.get('content-type') !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') throw new RequestFailure(415, 'Upload the revision-2 .xlsx workbook.');
        const imported = importWorkbook(await bytes(request));
        const created = store.create(owner, imported.profile, imported.estimate_pointers);
        result = { profile_id: created.profile_id, ...created.revisions[0], eligibility: assessIntake(created.revisions[0].profile), import_warnings: imported.warnings };
      }
      else if (parts[0] === 'template' && method === 'GET' && parts.length === 1) result = intakeTemplate(url.searchParams.get('books_through') ?? '');
      else if (parts[0] === 'simulate' && method === 'POST' && parts.length === 1) result = store.simulate(owner, ProfileSimulationInputSchema.parse(await input(request)));
      else if (parts[0] === 'profiles' && parts.length === 1 && method === 'GET') result = store.list(owner);
      else if (parts[0] === 'profiles' && parts.length === 1 && method === 'POST') {
        const created = store.create(owner, ProfilePayloadSchema.parse(await input(request)));
        result = { profile_id: created.profile_id, ...created.revisions[0], eligibility: assessIntake(created.revisions[0].profile) };
      } else if (parts[0] === 'profiles' && parts.length >= 2) {
        const id = z.uuid().parse(parts[1]);
        if (parts.length === 2 && method === 'GET') {
          const requested = revision.parse(Number(url.searchParams.get('revision')));
          const record = store.read(owner, id, requested);
          result = { profile_id: id, ...record, eligibility: assessIntake(record.profile) };
        } else if (parts.length === 2 && method === 'DELETE') { store.delete(owner, id); result = { deleted: true }; }
        else if (parts.length === 2 && method === 'PATCH') {
          const body = save.parse(await input(request)), record = store.save(owner, id, body.revision, body.profile);
          result = { profile_id: id, ...record, eligibility: assessIntake(record.profile) };
        } else if (parts.length === 3 && method === 'POST') {
          const body = await input(request);
          if (parts[2] === 'review') {
            const parsed = z.strictObject({ revision, selections: z.array(z.strictObject({ pointer: z.string().max(200), state: z.enum(['confirmed', 'reviewed_estimate', 'not_applicable']), rationale: z.string().min(1).max(2000) })).min(1).max(1500) }).parse(body);
            const record = store.review(owner, id, parsed.revision, parsed.selections);
            result = { profile_id: id, ...record, eligibility: assessIntake(record.profile) };
          } else if (parts[2] === 'preview') result = store.preview(owner, id, transition.parse(body).revision);
          else if (parts[2] === 'acknowledge') {
            const parsed = z.strictObject({ revision, preview_id: z.uuid() }).parse(body);
            result = store.acknowledge(owner, id, parsed.revision, parsed.preview_id);
          } else if (parts[2] === 'confirm') {
            const record = store.confirm(owner, id, transition.parse(body).revision);
            result = { profile_id: id, ...record, eligibility: assessIntake(record.profile) };
          } else throw new RequestFailure(404, 'Intake endpoint not found.');
        } else throw new RequestFailure(405, 'This action is not available.');
      } else throw new RequestFailure(404, 'Intake endpoint not found.');
      return json(result, { headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      if (error instanceof ImportFailure) return apiError(422, 'WORKBOOK_IMPORT', `${error.issues[0]?.location}: ${error.message}`, error.issues.slice(0, 100).map(i => ({ path: i.location, message: i.message })));
      if (error instanceof RequestFailure) return apiError(error.status, 'INTAKE_REQUEST', error.message);
      if (error instanceof z.ZodError) return apiError(422, 'VALIDATION_ERROR', 'Check the intake fields.', error.issues.map(i => ({ path: '/' + i.path.map(String).join('/'), message: i.message })));
      if (error instanceof Error) {
        const known = new Set(['Profile not found', 'Revision not found', 'Revision conflict', 'Confirmed revision is immutable', 'Source review required', 'Intake has blocking preflight issues', 'Preview mismatch', 'Exact preview acknowledgment required', 'Confirmation binding mismatch', 'Confirmed binding required', 'Stored snapshot mismatch', 'Company-specific Monte Carlo is unavailable', 'Reviewed estimate must retain estimate state', 'Profile limit reached', 'Revision limit reached', 'Unresolved profile derivation dependency', 'Unreviewed profile derivation dependency', 'Cyclic profile derivation dependency', 'Unresolved reconciliation pointer', 'Unresolved review pointer']);
        if (known.has(error.message)) return apiError(error.message.includes('not found') ? 404 : 409, 'INTAKE_CONFLICT', error.message);
      }
      return apiError(500, 'INTERNAL_ERROR', 'The intake could not be processed.');
    }
  };
}
