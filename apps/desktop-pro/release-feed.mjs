export function releaseFeed(version,url,sha256,size,date=new Date().toISOString()){
 if(!/^\d+\.\d+\.\d+$/.test(version)||!/^https:\/\/github\.com\/sariserhan\/jamloom\/releases\/download\/pro-v\d+\.\d+\.\d+\/Jamloom-Pro-\d+\.\d+\.\d+-macOS\.zip$/.test(url)||!url.includes('/pro-v'+version+'/Jamloom-Pro-'+version+'-')||! /^[a-f0-9]{64}$/.test(sha256)||!Number.isSafeInteger(size)||size<1||!Number.isFinite(Date.parse(date)))throw Error('Invalid Pro release');
 return {currentRelease:version,releases:[{version,updateTo:{version,url,name:'Jamloom Pro '+version,notes:'Pro v1: expanded performance console, eight hot cues, beat grids and detachable studio windows.',pub_date:date,sha256,size}}]};
}
