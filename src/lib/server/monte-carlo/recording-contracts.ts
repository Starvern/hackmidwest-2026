/** Durable internal recording envelope; does not enable public risk execution. */
import { z } from 'zod';
import { ProfileSimulationInputSchema } from '../intake/schemas.ts';
import { ProfileMCContextSchema } from './binding.ts';
import { MCResultExtensionSchema } from './contracts.ts';
export const ProfileMCStoredRecordingSchema = z.strictObject({
  recording_version: z.literal('profile-mc-recording-1-candidate'), recording_id: z.uuid(),
  recorded_at: z.iso.datetime(), expires_at: z.iso.datetime(), input: ProfileSimulationInputSchema,
  recording: z.strictObject({ context: ProfileMCContextSchema, result: MCResultExtensionSchema }),
}).superRefine((v, ctx) => {
  if (v.recording_id !== v.recording.result.run_id) ctx.addIssue({ code: 'custom', path: ['recording_id'], message: 'Recording/run identity mismatch' });
  if (Date.parse(v.recorded_at) >= Date.parse(v.expires_at)) ctx.addIssue({ code: 'custom', path: ['expires_at'], message: 'Recording expiry must follow creation' });
});
export type ProfileMCStoredRecording = z.infer<typeof ProfileMCStoredRecordingSchema>;
