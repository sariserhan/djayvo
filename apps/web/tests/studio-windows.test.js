import test from 'node:test';
import assert from 'node:assert/strict';
import {studioElement} from '../studio-windows.js';
test('empty navigation hashes have no target and never become an invalid selector',()=>{
 for(const id of ['',null,undefined])assert.equal(studioElement(id),null);
});
