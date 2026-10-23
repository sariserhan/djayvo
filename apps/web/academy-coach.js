import {validateLesson} from './academy-manifest.js';
import {attachAcademyOffline} from './academy-offline.js';
import {LessonRun,EVALUATOR_VERSION} from './academy-evaluator.js';
import {revealStudioControl} from './studio-view.js';
export async function attachAcademy({bridge,load,assets}){
 const practice=location.pathname.endsWith('/practice'),challenge=location.pathname.includes('/challenges/');
 const offline=location.pathname.startsWith('/academy-offline/');
 const id=offline?'first-crossfade':location.pathname.split('/').at(-1)==='practice'?'first-crossfade':new URLSearchParams(location.search).get('academy')||location.pathname.split('/').at(-1);
 const response=await fetch(offline?'/academy-offline/lesson.json':'/api/academy/lesson/'+encodeURIComponent(id));
 const data=await response.json();if(!response.ok)throw new Error(data.error);
 const {tracks}=data,lesson=validateLesson(data.lesson),run=new LessonRun(lesson),storage='jamloom-academy-v1';
 let failures=0,attempt=null,sync=false,demo=false,ready=false,feedback='',narration=false,disposed=false;
 const panel=document.createElement('section');panel.className='academy-coach';panel.id='academy-coach';panel.setAttribute('aria-label','DJ Academy coach');
 panel.innerHTML='<nav><a href="/academy/learn">← Academy</a><span id="academy-stage"></span><a href="/academy/practice">Practice studio</a><a href="/academy-offline/index.html">Prepare free lesson offline</a></nav><h2 id="academy-objective"></h2><p id="academy-feedback" class="academy-feedback" role="status" aria-live="polite"></p><div class="academy-actions"><button id="academy-load">Load the two practice tracks</button><button id="academy-check" hidden>Check my task</button><button id="academy-next" hidden>Continue when ready</button><button id="academy-retry" hidden>Try again</button><button id="academy-show" hidden>Show me an eight-beat fade</button><button id="academy-pause" hidden>Pause coaching</button><button id="academy-focus" hidden>Find the control</button><button id="academy-sound" aria-pressed="false">Spoken hints: off</button></div><fieldset id="academy-answer-panel" hidden><legend id="academy-question">Choose your answer</legend><select id="academy-answer" aria-labelledby="academy-question"></select></fieldset><details><summary>Why this works / controls</summary><p id="academy-why"></p><p>Tab to a control. Arrow keys adjust sliders; Shift is not needed. The highlighted control uses the same mixer as ordinary DJ practice. Start with a low speaker volume. No headphones or controller required.</p></details><details id="academy-set-plan"><summary>Set plan and listening review</summary><label for="academy-plan">Plan a sequence, cue points, energy changes and a backup. After replaying your recording, note one timing issue, one artistic choice and your next correction.</label><textarea id="academy-plan" rows="5" maxlength="8000" placeholder="Track / cue / transition / energy / backup"></textarea><button id="academy-plan-download">Download my plan and review</button><p>This note stays in this tab until downloaded. It is not uploaded or automatically graded. Use the cleared public practice library for varied ungraded sets; measured course assessments use the two checked course tracks.</p></details><details><summary>Completion checklist</summary><ol id="academy-checklist"></ol></details><p id="academy-save" class="muted"></p><p class="muted">Practice music: Tricks &amp; Traps · CC0 · <a href="/academy-audio/CREDITS.txt">Credits and edits</a>. No Jamloom AI generations. Musical suitability and novice learning are still under review.</p>';
 document.querySelector('main').prepend(panel);const $=id=>panel.querySelector('#academy-'+id);
 document.body.classList.add('academy-session');
 if(offline)attachAcademyOffline(panel);
 const originalTitle=document.title;document.title=lesson.title+' · Jamloom DJ Academy';
 function paint(){
  const task=lesson.tasks[Math.min(run.index,lesson.tasks.length-1)];
  $('stage').textContent=`${lesson.title} · Task ${Math.min(run.index+1,lesson.tasks.length)} of ${lesson.tasks.length}`;
  $('objective').textContent=!ready?'1. Load your two tracks.':run.state==='completed'?'Lesson checks complete. Keep playing.':run.state==='free_jam'?'Free Jam. Take your time.':run.state==='paused'?'Free practice. The controls are yours.':task.objective;
  $('feedback').textContent=feedback+(run.state==='free_jam'?' '+task.practice:'');$('why').textContent=task.why;
  $('load').hidden=ready;$('load').disabled=run.state==='preparing';$('check').hidden=!ready||run.state!=='guided_attempt'||demo;
  $('next').hidden=run.state!=='free_jam';$('retry').hidden=!['failed_attempt','paused'].includes(run.state);
  $('retry').textContent=run.state==='paused'?'Resume coaching':'Try again';
  $('pause').hidden=!ready||run.state==='completed'||run.state==='free_jam'||demo;
  $('show').textContent=`Show me a ${task.beats??8}-beat fade`;
  $('show').hidden=challenge||!ready||task.kind!=='fade'||demo||run.state==='free_jam'||run.state==='completed';$('focus').hidden=!ready||run.state!=='guided_attempt';
  $('set-plan').hidden=!['intermediate','advanced','performance'].includes(lesson.level);
  $('answer-panel').hidden=task.kind!=='knowledge'||run.state!=='guided_attempt';
  if(task.kind==='knowledge'){$('question').textContent=task.objective;$('answer').replaceChildren(new Option('Choose an answer',''),...task.choices.map((label,i)=>new Option(label,String(i))));}
  $('checklist').replaceChildren(...lesson.tasks.map((t,i)=>{const li=document.createElement('li');li.textContent=`${run.results[i]?'✓ Checked:':'○ To do:'} ${t.objective}`;return li;}));
  document.querySelectorAll('.academy-target').forEach(el=>el.classList.remove('academy-target'));
  if(run.state==='guided_attempt'){const control=document.getElementById(task.control);revealStudioControl(control);control?.classList.add('academy-target');}
  if(narration&&'speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance($('objective').textContent));}
 }
 async function api(path,body){const r=await fetch('/api/academy/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw new Error(value.error||'Account sync unavailable');return value;}
 async function startAttempt(){if(offline){$('save').textContent='Offline practice: local checks only. Repeat online while signed in for verified account progress.';return;}try{const value=await api('attempt',{lessonId:id});attempt=value.id;sync=true;$('save').textContent='Signed in: checks will be verified and saved to your account.';}catch{sync=false;$('save').textContent='Local practice. Sign in for verified account progress; this browser copy is not a certificate.';}}
 const unsubscribe=bridge.subscribe(event=>{
  const recording=lesson.tasks[Math.min(run.index,lesson.tasks.length-1)].kind==='recording';
  if(event.action==='recording.start'&&recording&&run.state==='guided_attempt'){run.samples=[];run.recording=null;}
  else if(event.action==='recording.cancel'&&recording){run.recording=null;run.samples=[];}
  else if(event.action==='recording.complete'&&recording)run.recording=event.receipt;
  else if((event.action==='audio.sample'&&!recording)||(event.action==='recording.sample'&&recording)){
   const source=event.sample??event;const s=Object.fromEntries(Object.entries(source).filter(([k])=>k!=='action').map(([k,v])=>[k,typeof v==='number'?Number(v.toFixed(4)):v]));run.observe(s);
  }else if(event.control)run.action({t:event.t,source:event.source,control:event.control,value:event.value,beforeA:event.beforeA,beforeB:event.beforeB,afterA:event.afterA,afterB:event.afterB});
 });
 $('load').onclick=async()=>{panel.setAttribute('aria-busy','true');$('load').disabled=true;try{run.state='preparing';feedback='Loading Extended into A and Theories of Everything into B…';paint();await load(tracks);ready=true;run.state='available';if(practice){run.begin();run.pause();feedback='Unrestricted practice. Resume coaching only when you want a task.';}else{await startAttempt();run.begin();feedback=lesson.tasks[0].kind==='knowledge'?'Choose your answer below. The decks remain available for practice.':lesson.tasks[0].kind==='recording'?'Start both tracks as needed, enable Track loop, then record your set.':'Tracks ready. Press the actual Play A button below.';}}catch(e){run.state='available';feedback=e.message;}finally{panel.removeAttribute('aria-busy');$('load').disabled=false;paint();}};
 $('focus').onclick=()=>{const el=document.getElementById(lesson.tasks[run.index].control);revealStudioControl(el);el?.scrollIntoView({block:'center',behavior:'instant'});el?.focus();};
 $('plan-download').onclick=()=>{const url=URL.createObjectURL(new Blob([$('plan').value],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='jamloom-set-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('answer').onchange=()=>{if($('answer').value!=='')run.action({t:bridge.snapshot().t,control:'academy-answer',source:'user',value:Number($('answer').value)});};
 $('check').onclick=async()=>{if(demo)return;if(assets().some((v,i)=>v!==tracks[i].id)){feedback='Reload the supplied practice tracks before an assessment.';paint();return;}
  const result=run.verify();if(!result)return;feedback=result.feedback;if(!result.pass&&++failures>=lesson.tasks[run.index].maxAttempts)feedback+=' Tip: '+lesson.tasks[run.index].remediation;
  if(result.pass){
   try{const progress=JSON.parse(localStorage.getItem(storage)||'{}');progress[id]={version:lesson.version,checked:run.results.map(r=>r.taskId),updated:new Date().toISOString(),verified:false};localStorage.setItem(storage,JSON.stringify(progress));}catch{$('save').textContent='Browser storage unavailable; keep this tab open.';}
   if(sync)try{await api('result',{attemptId:attempt,taskId:lesson.tasks[run.index].id,evaluator:EVALUATOR_VERSION,assets:tracks.map(t=>t.sha256),...run.results[run.index].evidence});$('save').textContent='This check is saved to your account.';}catch(e){sync=false;$('save').textContent=e.message+' Local check kept; repeat in a new signed-in attempt to sync.';}
  }paint();};
 $('next').onclick=()=>{failures=0;run.next();feedback=run.state==='completed'?'All required checks passed in this session. These checks do not certify venue readiness.':'Continue on the same decks. Reset positions or levels if needed.';paint();};
 $('retry').onclick=async()=>{if(practice&&!attempt)await startAttempt();run.begin();feedback='Fresh attempt. Music and controls are still yours.';paint();};
 $('pause').onclick=()=>{run.pause();feedback='Coaching paused. Practice freely; no actions are graded.';paint();};
 $('sound').onclick=()=>{narration=!narration;$('sound').setAttribute('aria-pressed',String(narration));$('sound').textContent='Spoken hints: '+(narration?'on':'off');paint();};
 $('show').onclick=async()=>{demo=true;run.state='demonstrate';paint();feedback='Coach demonstration—this cannot complete your task.';$('feedback').textContent=feedback;
  try{await bridge.command('crossfade',0);for(const deck of ['a','b'])if(!bridge.snapshot()[deck==='a'?'playingA':'playingB'])await bridge.command('play-'+deck);
   const duration=(lesson.tasks[run.index].beats??8)*500,start=performance.now();while(performance.now()-start<duration&&!disposed){await bridge.command('crossfade',Math.min(1,(performance.now()-start)/duration));await new Promise(r=>setTimeout(r,80));}
   if(!disposed)await bridge.command('crossfade',0);
  }catch{feedback='Demonstration interrupted. You can still use the decks.';}finally{demo=false;run.state='available';run.begin();feedback=`Your turn. Both decks can keep playing; fade from A to B over ${lesson.tasks[run.index].beats??8} beats.`;if(!disposed)paint();}};
 window.addEventListener('pagehide',()=>{disposed=true;unsubscribe();window.speechSynthesis?.cancel();document.title=originalTitle;},{once:true});
 feedback='Two included tracks are ready for you. Start with your speakers at a comfortable volume.';
 paint();document.getElementById('dj').dispatchEvent(new Event('studio:coaching-ready'));
}
