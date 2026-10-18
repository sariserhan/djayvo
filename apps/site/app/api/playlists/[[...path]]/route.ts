import { catalogueRequest } from '../../../../lib/catalogue-http';
export const runtime='nodejs';
type Context={params:Promise<{path?:string[]}>};
async function handle(request:Request,context:Context){return catalogueRequest(request,(await context.params).path,true);}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
