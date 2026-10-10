import { json } from '@sveltejs/kit';

/** HTTP availability only; simulation readiness requires accepted engine integration. */
export function GET() {
	return json({ status: 'ok', simulation_ready: false });
}
