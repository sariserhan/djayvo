import {ImageResponse} from 'next/og';
export const alt='Jamloom — Learn to DJ. Build your first mix.';
export const size={width:1200,height:630};export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#101211',color:'#f0f3eb',width:'100%',height:'100%',padding:70}}><div style={{fontSize:36}}>jamloom</div><div style={{fontSize:80,lineHeight:1.05,display:'flex',flexDirection:'column'}}><span>Learn to DJ.</span><span style={{color:'#c3ef69'}}>Make your first mix.</span></div><div style={{fontSize:24}}>DJ lessons · Mixing practice · Your next sound</div></div>,size);}
