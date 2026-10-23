// Browser transport fixture only. Real model and listening evidence are recorded separately.
export async function songFixture(context){
 const jobs=new Map();let counter=0;const bodies=[];
 const wav=Buffer.alloc(44+48000*2*30);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 for(let i=0;i<48000*30;i++)wav.writeInt16LE(Math.round(1000*Math.sin(2*Math.PI*220*i/48000)),44+i*2);
 await context.route('**/api/taste/song*',async route=>{
  const req=route.request(),url=new URL(req.url()),id=url.searchParams.get('id');
  if(req.method()==='POST'){
   const profile=req.postDataJSON();bodies.push(profile);const id=String(++counter).padStart(32,'0');
   jobs.set(id,{id,profile,styleChecked:true,direction:{label:profile.referenceMetadata?.[0]?.genre??'Test style'},state:'running',message:'Writing your song…',polls:0,plan:{title:`Fixture song ${counter}`,summary:'Test interpretation based on the submitted favorites.',influences:profile.references.map(reference=>({reference,basis:'genre_only',description:'Test genre influence'})),cases:[{lyrics:'[Verse]\nFixture lyrics\n[Chorus]\nA song for browser testing',song_caption:'Warm piano and singing',bpm:92,voice:'female'}]}});
   return route.fulfill({status:202,json:{id}});
  }
  if(!id)return route.fulfill({json:{available:true}});
  const song=jobs.get(id);if(!song)return route.fulfill({status:404,json:{error:'Unknown fixture song'}});
  if(req.method()==='DELETE'){song.state='cancelled';song.message='Composition stopped';return route.fulfill({json:{state:'cancelled'}});}
  if(url.searchParams.get('file')==='audio')return route.fulfill({contentType:'audio/wav',headers:{'Content-Disposition':'attachment; filename="test.wav"'},body:wav});
  if(url.searchParams.get('file')==='plan')return route.fulfill({json:song.plan});
  if(song.state==='running'&&++song.polls>=2){song.state='completed';song.message='Your song is ready.';}
  return route.fulfill({json:song});
 });
 return {bodies,jobs};
}
