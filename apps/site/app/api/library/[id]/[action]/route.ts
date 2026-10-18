import { audioRequest } from '../../../../../lib/audio-http';
export const runtime='nodejs';
type Context={params:Promise<{id:string;action:string}>};
async function handle(request:Request,context:Context) {
  const {id,action}=await context.params;
  return audioRequest(request,id,action);
}
export const GET=handle;
export const POST=handle;
export const PUT=handle;
export const DELETE=handle;
