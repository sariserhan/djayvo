import { services, accountsConfigured } from '../../../../lib/services';
import { boundedAuthRequest } from '../../../../lib/bounded-request';

export const runtime = 'nodejs';
async function handle(request: Request) {
  if (!accountsConfigured()) return Response.json({ error: 'Accounts are temporarily unavailable.' }, { status: 503 });
  try {
    const bounded = await boundedAuthRequest(request);
    if (!bounded) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const response = await services().auth.handler(bounded);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return Response.json({ error: 'Account request failed. Please try again.' }, { status: 503 });
  }
}
export const GET = handle;
export const POST = handle;
