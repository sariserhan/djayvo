'use client';
import {useEffect,useState} from 'react';
export function SiteBanner(){
 const [banner,setBanner]=useState('');
 useEffect(()=>{
  let controller=new AbortController();
  async function update(){try{
   if(controller.signal.aborted)controller=new AbortController();
   const r=await fetch('/api/site-status',{cache:'no-store',signal:controller.signal});
   if(r.ok){const v=await r.json();setBanner(typeof v.banner==='string'?v.banner:'');}
  }catch{}}
  void update();const timer=setInterval(update,60000),cancel=()=>controller.abort();
  // Abort navigation-time requests; the timer resumes if the browser restores this page.
  window.addEventListener('pagehide',cancel);
  return()=>{cancel();clearInterval(timer);window.removeEventListener('pagehide',cancel);};
 },[]);
 return banner?<aside className="site-announcement" aria-label="Site announcement" role="status">{banner}</aside>:null;
}
