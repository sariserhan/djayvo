// Country is a weak language hint, never a nationality or identity claim.
export async function songCountry(request:Request,fetcher:typeof fetch=fetch,onVercel=process.env.VERCEL==='1'):Promise<string|null>{
 const country=(value:unknown)=>typeof value==='string'&&/^[A-Z]{2}$/.test(value)&&!['XX','ZZ'].includes(value)?value:null;
 if(onVercel)return country(request.headers.get('x-vercel-ip-country'));
 const url=new URL(request.url),forwarded=request.headers.get('x-forwarded-for');
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||
    (forwarded&&!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(forwarded)))return null;
 // Only the loopback preview shares its user's public egress; never locate a hosted server this way.
 try{
  const response=await fetcher('https://api.country.is/',{signal:AbortSignal.timeout(1500),cache:'no-store',redirect:'error'});
  if(!response.ok)return null;
  return country((await response.json()).country);
 }catch{return null;}
}
