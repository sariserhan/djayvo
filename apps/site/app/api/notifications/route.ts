import {services} from '../../../lib/services';import {deliverNotifications} from '../../../lib/notifications';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;if(!secret||secret.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new Response(null,{status:401});
 try{const {pool,config}=services();return Response.json(await deliverNotifications(pool,config));}catch{return new Response(null,{status:503});}
}
