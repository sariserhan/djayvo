import { paidGenerationReleased } from '../../../../lib/product';
export const runtime='nodejs';
export async function POST(){
  return Response.json({error:paidGenerationReleased?'Checkout requires release wiring':'Purchases are closed while musical quality and payment reconciliation are validated.'},{status:503});
}
