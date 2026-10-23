import test from 'node:test';
import assert from 'node:assert/strict';
import {snapToBeat,resizedLoop,waveformPeaks} from '../pro-deck-tools.js';
test('cue quantizing follows a nonzero grid and clamps track edges',()=>{
 assert.equal(snapToBeat(1.48,120,.1,8),1.6);assert.equal(snapToBeat(0,120,.4,8),0);assert.equal(snapToBeat(8,120,.1,8),8);
 for(const args of [[1,0,0,8],[1,120,-1,8],[NaN,120,0,8],[1,120,9,8]])assert.throws(()=>snapToBeat(...args));
});
test('loop resizing preserves start and rejects unsafe regions',()=>{
 assert.deepEqual(resizedLoop([2,4],.5,8),[2,3]);assert.deepEqual(resizedLoop([2,4],2,8),[2,6]);
 for(const args of [[[2,6],2,8],[[2,1],.5,8],[[0,.02],.5,8],[null,2,8]])assert.throws(()=>resizedLoop(...args));
});
test('waveform takes both channels and every frame including the tail',()=>{
 const channels=[new Float32Array([0,.5,0,0,.1]),new Float32Array([.8,0,0,0,-1])];const buffer={length:5,numberOfChannels:2,getChannelData:i=>channels[i]};
 assert.deepEqual([...waveformPeaks(buffer,2)],[Math.fround(.8),1]);assert.equal(waveformPeaks(buffer,1000).length,5);assert.equal(waveformPeaks(buffer,1000)[4],1);
});
