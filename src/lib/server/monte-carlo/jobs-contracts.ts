import { z } from 'zod';
export const MC_JOB_VERSION = 'mc-job-1-candidate' as const;
export const MCJobStatusSchema = z.strictObject({
  transport_version: z.literal(MC_JOB_VERSION),
  job_id: z.uuid(),
  state: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  completed_runs: z.number().int().min(0).max(2000),
  total_runs: z.literal(2000),
  created_at: z.iso.datetime(),
  finished_at: z.iso.datetime().nullable(),
  expires_at: z.iso.datetime().nullable(),
  error: z.enum(['EXECUTION_FAILED', 'EXECUTION_TIMEOUT']).nullable(),
});
export const MCJobReceiptSchema = z.strictObject({
  ...MCJobStatusSchema.shape,
  access_token: z.string().regex(/^[a-f0-9]{64}$/),
  status_url: z.string().startsWith('/api/v1/simulate/monte-carlo/jobs/'),
  result_url: z.string().startsWith('/api/v1/simulate/monte-carlo/jobs/'),
});
