import test from 'node:test';
import assert from 'node:assert/strict';
import {trusted,assetPath,cataloguePath,settings,permissionAllowed,detachable} from '../policy.mjs';
test('desktop boundaries reject arbitrary hosts, files, APIs and capture',()=>{
 assert.ok(trusted('jamloom://studio/dj.html'));
 for(const url of ['file:///etc/passwd','https://studio/dj.html','jamloom://evil/dj.html','jamloom://user@studio/a','jamloom://studio:9/a'])assert.equal(trusted(url),false);
 assert.equal(assetPath('jamloom://studio/engine/jamloom_live.wasm','/bundle'),'/bundle/engine/jamloom_live.wasm');
 for(const name of ['/%2e%2e%2fsecret','/.env','/a%00b','/a%5cb'])assert.equal(assetPath('jamloom://studio'+name,'/bundle'),null);
 assert.ok(cataloguePath('/api/aurowall/'+'a'.repeat(24)));
 for(const name of ['/api/account','/api/aurowall/../private','https://evil/','/api/aurowall?url=evil'])assert.equal(cataloguePath(name),false);
 assert.deepEqual(settings({automaticUpdates:1,catalogue:false}),{catalogue:false,automaticUpdates:false});
 assert.ok(permissionAllowed('media',{mediaTypes:['audio']}));
 for(const permission of ['media','display-capture','serial','clipboard-read'])assert.equal(permissionAllowed(permission,{mediaTypes:['video']}),false);
});

test('only the fixed local studio panel can open a desktop window',()=>{
 assert.ok(detachable('jamloom://studio/detached.html'));
 for(const url of ['https://studio/detached.html','jamloom://evil/detached.html','jamloom://studio/settings.html','jamloom://studio/detached.html?url=evil','jamloom://studio/detached.html#evil'])assert.equal(detachable(url),false);
});
