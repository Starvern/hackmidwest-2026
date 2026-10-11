import { jobAction } from '../../../../../../../../lib/server/monte-carlo/jobs-api.ts';
export const GET = (event: Parameters<typeof jobAction>[1]) => jobAction('result', event);
