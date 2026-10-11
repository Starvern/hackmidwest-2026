import type { RequestHandler } from '@sveltejs/kit';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { ProfileStore } from '../../../../../lib/server/intake/store.ts';
import { intakeApi } from '../../../../../lib/server/intake/api.ts';
import { apiError } from '../../../../../lib/server/api/http.ts';

let store: ProfileStore | undefined;
const handler: RequestHandler = async event => {
  const directory = process.env.OPERATOROS_INTAKE_DIRECTORY;
  if (!['darwin', 'linux'].includes(process.platform))
    return apiError(503, 'INTAKE_UNAVAILABLE', 'Local business intake currently requires macOS or Linux. Windows private storage is not supported yet.');
  if (process.env.OPERATOROS_INTAKE_REVIEW !== '1' || !directory || !isAbsolute(directory) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(event.url.hostname))
    return apiError(503, 'INTAKE_UNAVAILABLE', 'Business intake is available only in the configured local review environment.');
  try {
    if (!store) { mkdirSync(directory, { recursive: true, mode: 0o700 }); store = new ProfileStore(join(directory, 'profiles.sqlite')); }
    return await intakeApi(store)(event);
  } catch { return apiError(503, 'INTAKE_UNAVAILABLE', 'Local intake storage is unavailable.'); }
};
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
