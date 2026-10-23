'use client';
import {useEffect,useState} from 'react';
import Script from 'next/script';
import {visitorPingEnabled} from '../lib/visitorping';
export function VisitorPing(){
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{setEnabled(visitorPingEnabled(window.location.hostname));},[]);
 return enabled?<Script src="https://cdn.visitorping.com/site/vp_QBDH92AC.js" strategy="afterInteractive" crossOrigin="anonymous"/>:null;
}
