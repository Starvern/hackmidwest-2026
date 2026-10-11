import { loadGrowthCompany } from '../../../../../lib/server/api/company.ts';
import { apiResponse } from '../../../../../lib/server/api/http.ts';

export function GET() {
  return apiResponse(loadGrowthCompany);
}
