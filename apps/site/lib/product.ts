import type { Metadata } from 'next';

export const origin = 'https://www.jamloom.com';
// Quality is a release decision backed by a listening study, never an env toggle.
export const paidGenerationReleased = false;
export const features = [
  {slug:'academy',title:'DJ Academy',headline:'Learn to DJ. Build your first mix.',platform:'Desktop web',status:'Free lesson preview',description:'Start learning to DJ with a free beginner lesson. Practise a crossfade on real browser decks, check your timing and keep mixing at your own pace.',detail:'Free beginner introduction. The $79.99 one-time Complete Pass is planned; full-course sales and novice-learning validation are not released.',action:'Learn to DJ',href:'/academy'},
  { slug:'improvise', title:'Improvise', headline:'Your sound. A whole new song.', platform:'Web', status:'AI song studio', description:'Record or import a sound, choose a style and create an original song with AI singing.', detail:'Song creation uses credits when available. Free local remixes remain available on your device.', action:'Create an AI song', href:'/improvise' },
  { slug:'dj-studio', title:'DJ Studio', headline:'Practise your DJ skills. Make your next mix.', platform:'Desktop web + Mac', status:'Free Basic + Pro sample demo', description:'Practise DJ mixing on your laptop with free tracks or your own music. Use two decks, EQ, cue points, loops and instruments, then record a set to hear your progress.', detail:'Decoded tracks support bidirectional scratch, key lock and reverb, phaser and flanger. Separate headphone cue requires two supported outputs and an explicit headphone test. Physical routing and venue endurance remain under evaluation.', action:'Open Studio', href:'/studio/dj.html' },
  { slug:'live-dj', title:'Live Audio DJ', headline:'Shape the sound that’s playing.', platform:'Mac companion preview + supported browsers', status:'Experimental live source', description:'Process a permitted app locally with the Mac companion, or use supported tab capture. Stop capture at any time.', detail:'The Mac companion keeps audio native and pairs with website controls. Browser tab support varies. Neither mode controls another app’s play, pause or seek buttons.', action:'Try Live Source', href:'/live-dj' },
  { slug:'music-dna', title:'My Music DNA', headline:'Find your taste. Leave room for surprise.', platform:'Web preview', status:'Local full-song preview', description:'Add your favorite songs and artists. Turn your taste into a new song with AI singing, original lyrics and a full arrangement.', detail:'Your favorites guide the musical direction. Full-song generation is available on the configured local preview; catalogue metadata and model interpretation guide it, without sampling the original recordings.', action:'Explore your DNA', href:'/music-dna' },
] as const;
export function pageMetadata(title:string, description:string, path:string):Metadata {
  return {title,description,alternates:{canonical:origin+path},robots:{index:true,follow:true},
    openGraph:{title,description,url:origin+path,siteName:'Jamloom',type:'website',images:[{url:'/opengraph-image',width:1200,height:630}]},
    twitter:{card:'summary_large_image',title,description,images:['/opengraph-image']}};
}
