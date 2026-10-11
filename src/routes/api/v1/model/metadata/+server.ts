import { loadModelMetadata } from '../../../../../lib/server/api/metadata.ts';
import { apiResponse } from '../../../../../lib/server/api/http.ts';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { localMonteCarloAvailable } from '../../../../../lib/server/monte-carlo/availability.ts';

export function GET({ url }: { url: URL }) {
  return apiResponse(() => loadModelMetadata(localMonteCarloAvailable(url) && existsSync(resolve('.mc-worker/worker-entry.js'))));
}
