import test from 'node:test';
import assert from 'node:assert/strict';
import {rotaryValue} from '../pro-console.js';
test('rotary drag follows range, step and bounds',()=>{
 assert.equal(rotaryValue(0,80,-12,12,1),12);
 assert.equal(rotaryValue(0,-100,-12,12,1),-12);
 assert.equal(rotaryValue(.1,16,0,.5,.01),.15);
});
