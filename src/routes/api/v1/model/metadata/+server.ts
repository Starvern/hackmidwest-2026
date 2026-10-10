import { loadModelMetadata } from '../../../../../lib/server/api/metadata.ts';
import { apiResponse } from '../../../../../lib/server/api/http.ts';

export function GET() {
  return apiResponse(loadModelMetadata);
}
