import {services} from '../../../lib/services';
import {maintenance} from '../../../lib/maintenance';
export const runtime='nodejs';
export const maxDuration=180;
export const GET=(request:Request)=>maintenance(request,services);
