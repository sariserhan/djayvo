import './env';
import {writeFile} from 'node:fs/promises';import {isAbsolute} from 'node:path';
import {readConfig} from '../lib/config';import {createPool} from '../lib/database';import {VastProvider} from '../lib/vast-provider';import {uuid} from '../lib/audio-validation';
const [id,path]=process.argv.slice(2);uuid(id);if(!path||!isAbsolute(path))throw Error('Use JOB_ID /absolute/private/evidence.json');
const config=readConfig(),pool=createPool(config.databaseURL);
try{
 const rental=(await pool.query('SELECT * FROM generation_rentals WHERE reservation_id=$1',[id])).rows[0];
 if(!rental?.instance_id||!rental.destroy_confirmed_at)throw Error('Confirmed provider shutdown required before cost collection');
 const from=Math.floor(rental.prepared_at.getTime()/86400000)*86400,to=(Math.floor(rental.destroy_confirmed_at.getTime()/86400000)+1)*86400-1;
 const result=await new VastProvider(process.env.VASTAI_KEY??'').charges(Number(rental.account_id),Number(rental.instance_id),rental.label,from,to);
 await writeFile(path,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({id,observedProviderCostMicros:result.observedCostMicros,evidenceSha256:result.evidenceSha256,final:false,settlement:'held until billing finality and all attributable costs are reviewed'}));
}finally{await pool.end();}
