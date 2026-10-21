import {ACADEMY_PRICE_CENTS} from './academy-content';
// Planning assumptions, not a Stripe quote or a claim about realized lifetime profitability.
export function academyContribution({processorBps=350,processorFixedCents=50,refundReserveBps=800,hostingReserveCents=1000,supportReserveCents=2000}={}){
 const inputs=[processorBps,processorFixedCents,refundReserveBps,hostingReserveCents,supportReserveCents];
 if(inputs.some(n=>!Number.isSafeInteger(n)||n<0)||processorBps>10000||refundReserveBps>10000)throw Error('Invalid Academy cost model');
 const processing=Math.ceil(ACADEMY_PRICE_CENTS*processorBps/10000)+processorFixedCents;
 const refundReserve=Math.ceil(ACADEMY_PRICE_CENTS*refundReserveBps/10000);
 const contribution=ACADEMY_PRICE_CENTS-processing-refundReserve-hostingReserveCents-supportReserveCents;
 return {priceCents:ACADEMY_PRICE_CENTS,processing,refundReserve,hostingReserveCents,supportReserveCents,contribution,positive:contribution>0,cloudInferenceRequests:0,tax:'Collected separately; tax proceeds are not revenue.'};
}
