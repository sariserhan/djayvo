// USD microdollars avoid floating-point money and preserve conservative rounding.
export const CREDIT_PACKS={starter:{cents:999,credits:10},creator:{cents:2499,credits:25},studio:{cents:4999,credits:50}} as const;
export const COST_CATEGORIES=['gpu','startupIdle','orchestration','storage','bandwidth','inference','retries','support','infrastructure','fxTaxRisk'] as const;
export type Costs=Record<typeof COST_CATEGORIES[number],number>;
export function integer(value:number,min=0,max=1_000_000_000_000) {
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error('Invalid bounded integer');
  return value;
}
export function netProceeds(gross:number,deductions:{tax:number;provider:number;refundRisk:number;overhead:number;discount:number;fx:number}) {
  const keys=['tax','provider','refundRisk','overhead','discount','fx'];
  if(Object.keys(deductions).length!==keys.length||keys.some(k=>!Object.hasOwn(deductions,k)))throw new Error('Incomplete deductions');
  integer(gross,1);const values=Object.values(deductions);values.forEach(v=>integer(v));
  const net=gross-values.reduce((a,b)=>a+b,0);if(net<=0)throw new Error('Nonpositive net proceeds');return net;
}
export function quoteCost(costs:Costs,netPerCredit:number,marginBps=5000) {
  integer(netPerCredit,1);integer(marginBps,3000,9000);
  if(Object.keys(costs).length!==COST_CATEGORIES.length)throw new Error('Incomplete costs');
  const cap=COST_CATEGORIES.reduce((sum,key)=>sum+integer(costs[key]),0);integer(cap,1);
  // Round cost upward and income downward. No floating point ratio near a cent boundary.
  const credits=Number((BigInt(cap)*10000n+BigInt(netPerCredit)*(10000n-BigInt(marginBps))-1n)/(BigInt(netPerCredit)*(10000n-BigInt(marginBps))));
  return {credits:integer(credits,1,100000),costCapMicros:cap,marginBps};
}

export function privacyCredits(baseCredits:number) {
  integer(baseCredits,0,100000);
  return Math.ceil(baseCredits/4);
}

export type CreditLot={id:string;net_micros:number|string;credits:number;available:number};
export function allocateCredits(lots:CreditLot[],cap:number,marginBps:number,privateCreation=false){
 integer(cap,1,5_000_000);integer(marginBps,3000,9000);
 let remaining=BigInt(cap)*10000n;
 const allocations:{id:string;n:number;net:number;privacy:number}[]=[];
 for(const lot of lots){
  integer(lot.credits,1,100000);integer(lot.available,0,lot.credits);integer(Number(lot.net_micros),lot.credits);
  const net=Math.floor(Number(lot.net_micros)/lot.credits),budget=BigInt(net)*BigInt(10000-marginBps);
  const n=Math.min(lot.available,Number((remaining+budget-1n)/budget));
  if(n>0){allocations.push({id:lot.id,n,net,privacy:0});remaining-=BigInt(n)*budget;}if(remaining<=0n)break;
 }
 if(remaining>0n)throw new Error('Insufficient credits for profitable quote');
 let extra=privateCreation?privacyCredits(allocations.reduce((sum,a)=>sum+a.n,0)):0;
 for(const lot of lots){
  if(!extra)break;
  let a=allocations.find(a=>a.id===lot.id);
  const n=Math.min(extra,Math.max(0,lot.available-(a?.n??0)));if(!n)continue;
  if(!a){a={id:lot.id,n:0,net:Math.floor(Number(lot.net_micros)/lot.credits),privacy:0};allocations.push(a);}
  a.n+=n;a.privacy+=n;extra-=n;
 }
 if(extra)throw new Error('Insufficient credits for private creation');
 return allocations;
}
