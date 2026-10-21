import {readFile} from 'node:fs/promises';import {join} from 'node:path';
import {academyLesson} from './academy-content';import {accountsConfigured,services} from './services';import {AcademyStore} from './academy-store';
export async function academyDeckPage(request:Request,id:string){
 const lesson=academyLesson(id);if(!lesson)return new Response('Lesson not found',{status:404});
 if(!lesson.free){
  if(!accountsConfigured())return Response.redirect(new URL('/academy/checkout',request.url));
  const {auth,pool}=services(),session=await auth.api.getSession({headers:request.headers});
  if(!session?.user.emailVerified)return Response.redirect(new URL('/account/sign-in',request.url));
  try{await new AcademyStore(pool).allowed(session.user.id,id);}catch{return Response.redirect(new URL('/academy/learn',request.url));}
 }
 const html=(await readFile(join(process.cwd(),'public/studio/dj.html'),'utf8')).replace('<head>','<head><base href="/studio/"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/studio/academy.css">');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'}});
}
