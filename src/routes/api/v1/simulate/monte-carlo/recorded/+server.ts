import { localMonteCarloAvailable } from '../../../../../../lib/server/monte-carlo/availability.ts';
import { loadRecordedMonteCarlo } from '../../../../../../lib/server/monte-carlo/recorded.ts';
import { apiResponse, apiError } from '../../../../../../lib/server/api/http.ts';
export function GET({ url }: { url: URL }) {
  if (!localMonteCarloAvailable(url)) return apiError(503, 'MC_NOT_READY', 'Recorded risk review is available in local mode.');
  return apiResponse(loadRecordedMonteCarlo);
}
