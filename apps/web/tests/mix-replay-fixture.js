import { MIX_GAIN_TARGETS } from '../mixer.js';
export const emptyDeck = () => ({mode:'empty',duration_seconds:0,position_seconds:0,playing:false,rate:1,loop:false,
  region_seconds:null,key_lock:false,scratching:false,scratch_speed:0,roll:null});
export function replayFixture() {
  const link={wav_sha256:'a'.repeat(64),sample_rate:48000,observed_context_start_frame:0};
  return {schema_version:'1.0-mix-replay',recording:{schema_version:'1.0-mix-recording',scope:'post_limiter_studio_mix',origin:'unreviewed_live_capture',
    training_authorized:false,permission:'user_attested_private_mix',...link,frames:48000,timestamp_discontinuities:0,limit_reached:false},
    automation:{schema_version:'3.0-mix-automation',scope:'scheduled_gain_eq_fx_controls',training_authorized:false,...link,
      snapshot_context_frame:0,initial_targets:Object.fromEntries(MIX_GAIN_TARGETS.map(t=>[t,t.startsWith('eq-')?0:.6])),
      initial_effects:Object.fromEntries(['a','b','c','rack'].map(t=>[t,{tone:100,echo:0,spacing_ms:300}])),
      initial_deck_effects:{a:{reverb:0,phaser:0,flanger:0},b:{reverb:0,phaser:0,flanger:0}},events:[]},
    sources:{schema_version:'2.0-mix-sources',scope:'loaded_assets',permission:'user_attested_private_mix',rights_verified:false,training_authorized:false,...link,
      assets:[],snapshots:[{context_frame:0,a:null,b:null,c:null,phrase:null,rack:null,plan:null}]},
    transport:{schema_version:'1.0-mix-transport',scope:'observed_transport_states',training_authorized:false,...link,
      events:[{context_frame:0,target:'all',action:'snapshot',state:{a:emptyDeck(),b:emptyDeck(),prepared:null}}]},instrument:null};
}
