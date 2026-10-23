import {MAX_TASTE_BYTES} from './taste-limits';
import {songCountry} from './dna-location';
import {CloudSongs,songId} from './cloud-songs';
import {visibilityInput} from './dna-commerce';
import {boundedAuthRequest} from './bounded-request';
import {privateHeaders} from './audio-response';
import {AudioError} from './audio-validation';
import {storedDnaSong} from './dna-stored-song';

export async function cloudSongAPI(request:Request,songs:CloudSongs,owner:string|null,schedule:(id:string)=>void){
 const url=new URL(request.url),id=url.searchParams.get('id'),view=url.searchParams.get('view');
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
 try{
  if(request.method==='GET'&&view)return storedDnaSong(request,{commerce:songs.commerce,owner,readOnly:true});
  if(request.method==='GET'&&!id){
   const active=owner?(await songs.commerce.pool.query("SELECT id FROM dna_song_jobs WHERE owner_id=$1 AND product=$2 AND billing_live=$3 AND state IN ('queued','running') ORDER BY created_at DESC LIMIT 1",[owner,songs.commerce.product,!!songs.commerce.options.live])).rows[0]?.id:undefined;
   return json({available:true,creditsEnabled:true,signedIn:!!owner,mode:'cloud',active,balance:owner?await songs.commerce.wallet.balance(owner):null});
  }
  if(request.method==='GET'&&id){
   if(!songId(id))return json({error:'Song not found.'},404);
   const row=await songs.commerce.row(id);
   if(row?.owner_id===owner&&['queued','running'].includes(row.state)){
    if(url.searchParams.has('file'))return json({error:'Your song is not ready yet.'},409);
    schedule(id);return json(await songs.status(owner!,id));
   }
   return storedDnaSong(request,{commerce:songs.commerce,owner,readOnly:true});
  }
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-jamloom-dna')!=='1')return json({error:'Same-origin request required.'},403);
  if(!owner)return json({error:'Sign in with a verified account to make a song.'},401);
  if(request.method==='DELETE'&&songId(id)){const result=await songs.cancel(owner,id);schedule(id);return json(result);}
  if(request.method!=='POST')return json({error:'Unknown song action.'},400);
  const bounded=await boundedAuthRequest(request,MAX_TASTE_BYTES);if(!bounded)return json({error:'Song request is too large.'},413);
  const body=await bounded.json();
  if(!body||typeof body!=='object'||Array.isArray(body))throw new AudioError('Invalid song request.');
  if(body.action==='upload'&&songs.commerce.product==='improvise')return json(await songs.upload(owner,body));
  const input=await songs.input(owner,body.profile),visibility=visibilityInput(body.visibility,body.publicConsent);
  if(body.action==='quote')return json(await songs.commerce.quote(owner,input,visibility));
  if(body.action!=='submit')throw new AudioError('Review the price before making your song.');
  const result=await songs.submit(owner,body.requestId,input,visibility,body.token,songs.commerce.product==='music-dna'&&(!(input as {vocalLanguage?:string}).vocalLanguage||(input as {vocalLanguage?:string}).vocalLanguage==='auto')?await songCountry(request):null);schedule(result.id);return json(result,202);
 }catch(error){
  if(error instanceof SyntaxError)return json({error:'Invalid song request.'},400);
  if(error instanceof AudioError)return json({error:error.message},error.status);
  const message=error instanceof Error?error.message:'';
  if(/Insufficient credits/.test(message))return json({error:'You need more credits for this song. Visit Your credits to add some.'},402);
  if(/One active job/.test(message))return json({error:'Your other song is still being made. Wait for it to finish before starting another.'},409);
  if(/quote|Quote/.test(message))return json({error:'Your price needs refreshing. Please confirm your song again.'},409);
  return json({error:'We couldn’t confirm this request. Refresh to check your songs before trying again.'},503);
 }
}
