import {academyDeckPage} from '../../../../lib/academy-deck-page';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{lessonId:string}>}){return academyDeckPage(request,(await params).lessonId);}
