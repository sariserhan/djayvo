import {academyDeckPage} from '../../../lib/academy-deck-page';
export const runtime='nodejs';export async function GET(request:Request){return academyDeckPage(request,'first-crossfade');}
