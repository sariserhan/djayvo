import type { Metadata } from 'next';

export const origin = 'https://www.jamloom.com';
// Quality is a release decision backed by a listening study, never an env toggle.
export const paidGenerationReleased = false;
export const features = [
  {slug:'academy',title:'DJ Academy',headline:'Learn on the decks. Stay for the music.',platform:'Desktop web',status:'Free lesson preview',description:'Learn a transition on the real Jamloom decks, check your actions and keep practicing at your own pace.',detail:'Free beginner introduction. The $79.99 one-time Complete Pass is planned; full-course sales and novice-learning validation are not released.',action:'Learn to DJ',href:'/academy'},
  { slug:'improvise', title:'AI Improvisation', headline:'Your sound. A new musical idea.', platform:'Web + iPhone prototype', status:'Local preview', description:'Record a phrase, a laugh or a small everyday sound. Explore three arrangements, keep a recognizable hook and export your favourite.', detail:'The local composer works today. Its musical quality is still experimental; cloud generation is not for sale.', action:'Make a Remix', href:'/studio/index.html' },
  { slug:'dj-studio', title:'DJ Studio', headline:'Bring your tracks. Take the controls.', platform:'Desktop web', status:'Local studio', description:'Mix your own music with two decks, EQ, cue points, loops and a playable instrument rack. Your library stays on your computer.', detail:'Jogging seeks through a track. It is not vinyl scratching. Device cue routing and venue endurance need further testing.', action:'Open DJ Studio', href:'/studio/dj.html' },
  { slug:'live-dj', title:'Live Audio DJ', headline:'Shape the sound that’s playing.', platform:'Mac companion preview + supported browsers', status:'Experimental live source', description:'Process a permitted app locally with the Mac companion, or use supported tab capture. Stop capture at any time.', detail:'The Mac companion keeps audio native and pairs with website controls. Browser tab support varies. Neither mode controls another app’s play, pause or seek buttons.', action:'Try Live Source', href:'/live-dj' },
  { slug:'music-dna', title:'My Music DNA', headline:'Find your taste. Leave room for surprise.', platform:'Web + iPhone local preview', status:'Preference notebook', description:'Describe what you love: rhythm, instruments, energy and space. Build a transparent creative brief for original music.', detail:'Titles are references, not audio analysis. Save locally or explicitly to your web account. Taste-driven audio generation is not released.', action:'Explore your DNA', href:'/music-dna' },
] as const;
export function pageMetadata(title:string, description:string, path:string):Metadata {
  return {title,description,alternates:{canonical:origin+path},robots:{index:true,follow:true},
    openGraph:{title,description,url:origin+path,siteName:'Jamloom',type:'website',images:[{url:'/opengraph-image',width:1200,height:630}]},
    twitter:{card:'summary_large_image',title,description,images:['/opengraph-image']}};
}
