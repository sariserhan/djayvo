import {academyLesson} from '../../../../lib/academy-content';
import {academyDeckPage} from '../../../../lib/academy-deck-page';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{challengeId:string}>}){const {challengeId}=await params;return (challengeId==='first-crossfade'||academyLesson(challengeId)?.assessment)?academyDeckPage(request,challengeId):new Response('Challenge not available',{status:404});}
