import { services, accountsConfigured } from '../../../lib/services';
import { listTracks, parseCursor } from '../../../lib/library';
import { audioRequest } from '../../../lib/audio-http';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function POST(request:Request) { return audioRequest(request); }
export async function GET(request: Request) {
  if (!accountsConfigured()) return Response.json({ error: 'Library unavailable.' }, { status: 503, headers });
  try {
    const { auth, pool } = services();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user.emailVerified) return Response.json({ error: 'Sign in required.' }, { status: 401, headers });
    const url = new URL(request.url);
    if ([...url.searchParams.keys()].some(key => key !== 'cursor')) {
      return Response.json({ error: 'Unsupported query.' }, { status: 400, headers });
    }
    const cursor = url.searchParams.get('cursor') ?? undefined;
    try { parseCursor(cursor); } catch {
      return Response.json({ error: 'Invalid page cursor.' }, { status: 400, headers });
    }
    return Response.json(await listTracks(pool, session.user.id, cursor), { headers });
  } catch {
    return Response.json({ error: 'Library unavailable. Your local mixes are still in the studio.' }, { status: 503, headers });
  }
}
