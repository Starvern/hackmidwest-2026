/** Gate C accepts this opt-in, single-process local workflow only. */
export function localMonteCarloAvailable(url: URL) {
  return process.env.OPERATOROS_MC_REVIEW === '1' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
