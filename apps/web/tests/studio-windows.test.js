import test from 'node:test';
import assert from 'node:assert/strict';
import {studioElement, studioAnimationFrame} from '../studio-windows.js';
test('empty navigation hashes have no target and never become an invalid selector',()=>{
 for(const id of ['',null,undefined])assert.equal(studioElement(id),null);
});
test('animation preserves frame timestamps and supplies a finite fallback exactly once',t=>{
 let frame, fallback, cancelled;
 const previous=globalThis.window;
 globalThis.window={document:{hidden:false},requestAnimationFrame:fn=>(frame=fn,7),cancelAnimationFrame:id=>{cancelled=id;}};
 t.after(()=>{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;});
 t.mock.method(globalThis,'setTimeout',fn=>(fallback=fn,8));
 t.mock.method(globalThis,'clearTimeout',()=>{});
 const times=[];
 studioAnimationFrame(now=>times.push(now));frame(123.5);fallback();
 assert.deepEqual(times,[123.5]);
 studioAnimationFrame(now=>times.push(now));fallback();frame(456);
 assert.equal(times.length,2);assert.ok(Number.isFinite(times[1]));assert.equal(cancelled,7);
});
