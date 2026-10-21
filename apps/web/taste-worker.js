import createEngine from './engine/jamloom_web.mjs';

self.onmessage = async ({data}) => {
  try {
    const {seed,tempo,energy,instruments,novelty,seconds,direction} = data;
    if (![seed,tempo,energy,instruments,novelty,seconds,direction].every(Number.isInteger) ||
        seed<0 || seed>0xffffffff || tempo<60 || tempo>180 || energy<0 || energy>2 ||
        instruments<1 || instruments>31 || novelty<0 || novelty>100 || seconds<30 || seconds>180 || direction<0 || direction>2)
      throw new Error('Choose supported musical preferences.');
    const engine = await createEngine();
    const error = engine.ccall('jamloom_web_taste','string',Array(7).fill('number'),
      [seed,tempo,energy,instruments,novelty,seconds,direction]);
    if (error) throw new Error(error);
    const files = ['wav','score.json','report.json'].map(extension=>({
      name:`taste.${extension}`,bytes:engine.FS.readFile(`/taste.${extension}`)
    }));
    self.postMessage({type:'complete',files},files.map(file=>file.bytes.buffer));
  } catch(error) {
    self.postMessage({type:'error',message:error.message||'Composition could not finish.'});
  } finally { self.close(); }
};
