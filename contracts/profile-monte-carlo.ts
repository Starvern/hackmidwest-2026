/** Internal candidate profile job context; public execution remains gated. */
export type { ProfileMCContext } from '../src/lib/server/monte-carlo/binding.ts';
export type ProfileMCRecording = ReturnType<typeof import('../src/lib/server/monte-carlo/profile-jobs.ts').validateRecordedProfileMonteCarlo>;
export type { ProfileMCStoredRecording } from '../src/lib/server/monte-carlo/recording-contracts.ts';
