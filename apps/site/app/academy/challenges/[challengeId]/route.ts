import {academyDeckPage} from '../../../../lib/academy-deck-page';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{challengeId:string}>}){const {challengeId}=await params;return challengeId==='first-crossfade'?academyDeckPage(request,challengeId):new Response('Challenge not available',{status:404});}
