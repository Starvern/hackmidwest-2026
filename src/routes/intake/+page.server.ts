import { loadDemoCompany, loadGrowthCompany } from '../../lib/server/api/company.ts';

export function load() {
  return { examples: [
    { key: 'demo', company: loadDemoCompany(), href: '/', description: 'Established HVAC business with spare capacity.' },
    { key: 'growth', company: loadGrowthCompany(), href: '/?example=growth', description: 'Seasonal HVAC business with more demand than its current fleet can serve.' },
  ] };
}
