import {headers} from 'next/headers';
import {pageMetadata} from '../../lib/product';
import {services,accountsConfigured} from '../../lib/services';
import {proAccess} from '../../lib/pro-access';
import {proBilling} from '../../lib/pro-billing';
import {ProBuy,ProConfirmation} from './buy';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Jamloom Pro — $49 once','A professional DJ studio for your Mac and browser. Basic stays free. Pro v1 is a one-time $49 purchase.','/pro');
export default async function Pro({searchParams}:{searchParams:Promise<{payment?:string}>}){
 const {payment}=await searchParams;
 let active=false,signedIn=false,enabled=false,test=true;
 try{const b=proBilling();enabled=b.enabled;test=!b.config.live;if(accountsConfigured()){const {auth,pool}=services(),s=await auth.api.getSession({headers:await headers()});signedIn=!!s?.user.emailVerified;if(signedIn)active=await proAccess(pool,s!.user.id,b.config.live);}}catch{}
 return <section className="product-panel"><p className="eyebrow">Jamloom Pro</p><h1>Your full DJ studio. On the web and Mac.</h1><p>Two decks, scratch and loops, effects, sampler banks, instruments, MIDI, recording and Aurowall music.</p><p><a className="button" href="https://github.com/sariserhan/jamloom/releases/download/pro-v1.0.0/Jamloom-Pro-1.0.0-macOS.zip">Download Pro for Mac</a></p><p><strong>$49 once for Pro v1</strong>, plus applicable tax. No subscription. Includes v1 updates and use on your own compatible Macs and the web. Cloud music generation is sold separately when available; it is not included. Basic stays free.</p>{test&&<p>Payment testing mode — no real purchase is available here yet.</p>}
 {active?<><h2>Your Pro access is active</h2><p><a className="button primary" href="/studio/dj.html">Open web studio</a></p><form action="/api/pro/license" method="post"><button>Download Mac activation file</button></form><p>In the Mac app, open Settings → Activate Pro and choose this file. The app renews access online at startup and works offline for 30 days after a successful renewal. It never stops a set for a license check.</p></>:signedIn&&payment==='complete'?<ProConfirmation/>:signedIn?<ProBuy enabled={enabled}/>:<p><a className="button primary" href="/account/sign-in?returnTo=/pro">Sign in to get Pro</a></p>}
 <p><a href="/live-dj">Get free Basic</a> · <a href="/support">Purchase help</a> · <a href="/terms">Terms and refunds</a></p><p>Apple silicon Mac, macOS 14.2 or later. Separate headphone routing and physical MIDI controller qualification are not yet completed; single-output mixing works without either.</p></section>;
}
