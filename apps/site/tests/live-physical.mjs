// Opt-in hardware test: generated tones or cleared CC0 tracks in two owned processes.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
assert.equal(process.env.JAMLOOM_PHYSICAL_AUTHORIZED,'yes','Explicit owner-authorized hardware session required');
const folder=await mkdtemp(join(tmpdir(),'jamloom-physical-'));
const review=process.env.JAMLOOM_PHYSICAL_REVIEW==='yes';
const duration=review?100:Number(process.env.JAMLOOM_PHYSICAL_SECONDS??60);
assert.ok(Number.isInteger(duration)&&duration>=60&&duration<=3660);
const wave=join(folder,'generated-source-a.wav'),frames=(duration+30)*48000;
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+frames*2,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(48000,24);header.writeUInt32LE(96000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(frames*2,40);
const second=Buffer.alloc(96000);for(let i=0;i<48000;i++)second.writeInt16LE(Math.round(32767*.06*Math.sin(2*Math.PI*220*i/48000)*(i%24000<1440?1:.1)),i*2);
const fileHandle=await open(wave,'w');try{await fileHandle.write(header);for(let i=0;i<duration+30;i++)await fileHandle.write(second);}finally{await fileHandle.close();}
const player=spawn('/usr/bin/afplay',review?['-v','0.4','../web/practice-audio/party-sector.mp3']:[wave],{stdio:'ignore'});
let server,browser,qa,log='',token,panicSent=false,sourceEnded=false,silenced=false;
try {
 server=await chromium.launchServer({headless:false,ignoreDefaultArgs:['--mute-audio']});browser=await chromium.connect(server.wsEndpoint());
 const context=await browser.newContext(),page=await context.newPage();
 await page.setContent('<title>Jamloom controlled source B</title><h1>Jamloom test source B</h1><p>Generated 330 Hz tone at low level. No personal media.</p><button>Start test tone</button>');
 if(review){const data=await readFile('../web/practice-audio/atmosphere.mp3');await page.evaluate(src=>{document.querySelector('p').textContent='Cleared CC0 practice track: Atmosphere. Source A is Party Sector.';document.querySelector('button').onclick=()=>{const a=new Audio(src);a.volume=.4;a.loop=true;a.play();globalThis.testAudio=a;};},'data:audio/mpeg;base64,'+data.toString('base64'));}
 else await page.evaluate(()=>document.querySelector('button').onclick=()=>{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.frequency.value=330;g.gain.value=.015;o.connect(g).connect(c.destination);o.start();c.resume();globalThis.testAudio=c;});
 await page.getByRole('button').click();await delay(2000);
 const processes=execFileSync('ps',['-axo','pid=,ppid='],{encoding:'utf8'}).trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number));
 const children=new Set([server.process().pid]);let added=true;while(added){added=false;for(const [pid,parent] of processes)if(children.has(parent)&&!children.has(pid)){children.add(pid);added=true;}}
 const setup={sourcePIDs:[[player.pid],[...children]],output:'LG Ultra HD',seconds:duration,report:folder,recovery:review,master:review?.8:.15,media:review?['Party Sector · CC0','Atmosphere · CC0']:['Generated 220 Hz pulse at 120 BPM','Generated 330 Hz tone']};
 const file=join(folder,'setup.json');await writeFile(file,JSON.stringify(setup),{mode:0o600});
 console.log(JSON.stringify({folder,setup}));
 qa=spawn((process.env.JAMLOOM_QUALIFICATION_APP??'/tmp/Jamloom Live QA.app')+'/Contents/MacOS/JamloomLive',[file],{stdio:['ignore','pipe','pipe']});qa.stdout.on('data',b=>log+=b);qa.stderr.on('data',b=>log+=b);
 for(let second=0;second<duration+30;second++){
  await delay(1000);
  if(review){
   try{
    token??=JSON.parse(await readFile(join(folder,'grant.json'),'utf8')).token;
    const elapsed=JSON.parse(await readFile(join(folder,'latest.json'),'utf8')).elapsedSeconds;
    const headers={Origin:'http://127.0.0.1:4234',Authorization:'Bearer '+token};
    if(elapsed<75)assert.equal((await fetch('http://127.0.0.1:48191/status',{headers,signal:AbortSignal.timeout(2500)})).status,200);
    if(elapsed>=55&&!panicSent){assert.equal((await fetch('http://127.0.0.1:48191/stop',{method:'POST',headers,signal:AbortSignal.timeout(2500)})).status,200);panicSent=true;}
    if(elapsed>=64&&!sourceEnded){player.kill('SIGTERM');sourceEnded=true;}
    if(elapsed>=83&&!silenced){await page.evaluate(()=>{globalThis.testAudio.volume=0;});silenced=true;}
   }catch(e){if(e.code!=='ENOENT')throw e;}
  }
  try{const result=JSON.parse(await readFile(join(folder,'result.json'),'utf8'));console.log(JSON.stringify({status:result.status,elapsedSeconds:result.elapsedSeconds,checks:result.checks}));assert.equal(result.status,'PASS');break;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(qa.exitCode!==null||qa.signalCode!==null)throw Error('Qualification host exited: '+log);
  if(second===duration+29)throw Error('Qualification timed out');
 }
} catch(error) {await writeFile(join(folder,'failure.json'),JSON.stringify({status:'FAIL',reason:error.message}));throw error;}
finally {qa?.kill('SIGTERM');player.kill('SIGTERM');await browser?.close();await server?.close();await unlink(wave);await writeFile(join(folder,'host.log'),log);console.log('Physical evidence:',folder);}
