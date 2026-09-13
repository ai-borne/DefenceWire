/** Curator-only topic governance endpoint; writes are audited and never cached. */
import { handleTopicGovernance, previewTopicGovernance, GovernanceDependencies, TopicGovernanceRequest } from '../../../src/services/topicGovernanceHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';
interface Statement { bind(...params: unknown[]): Statement; all<T>(): Promise<{results:T[]}>; }
interface DB { prepare(sql:string): Statement; batch(statements: Statement[]): Promise<unknown>; }
interface Context { request: Request; env: { DB?: DB; CURATOR_SESSION_SECRET?:string; CURATOR_SESSION_EPOCH?:string; CURATOR_TEAM_DOMAIN?:string; }; }
async function dependencies(context: Context, authorized: boolean): Promise<GovernanceDependencies> {
  const db=context.env.DB!;
  return {
    verifyAuth: async()=>authorized,
    runQuery: async(sql,params)=>(await db.prepare(sql).bind(...params).all<Record<string,unknown>>()).results,
    runBatch: async(statements)=>{ await db.batch(statements.map((item)=>db.prepare(item.sql).bind(...item.params))); }
  };
}
function response(result: {success:boolean;error?:string;preview?:Record<string,unknown>}, authorized:boolean): Response {
  return Response.json(result,{status:result.success?200:authorized?400:401,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function onRequestGet(context: Context): Promise<Response> {
  if(!context.env.DB)return Response.json({success:false,error:'D1 database not configured'},{status:503});
  const auth=await verifyCuratorAuthorization(context.request.headers,context.request.headers.get('cookie'),context.env.CURATOR_SESSION_SECRET,context.env.CURATOR_TEAM_DOMAIN,globalThis.fetch,context.env.CURATOR_SESSION_EPOCH);
  const url=new URL(context.request.url);
  const result=await previewTopicGovernance({action:'topic',expectedVersion:0,topicId:url.searchParams.get('topicId')||'',targetTopicId:url.searchParams.get('targetTopicId')||undefined},await dependencies(context,auth.authorized),context.request.headers.get('cookie'));
  return response(result,auth.authorized);
}
export async function onRequestPost(context: Context): Promise<Response> {
  if(!context.env.DB)return Response.json({success:false,error:'D1 database not configured'},{status:503});
  const auth=await verifyCuratorAuthorization(context.request.headers,context.request.headers.get('cookie'),context.env.CURATOR_SESSION_SECRET,context.env.CURATOR_TEAM_DOMAIN,globalThis.fetch,context.env.CURATOR_SESSION_EPOCH);
  try { const result=await handleTopicGovernance(await context.request.json() as TopicGovernanceRequest,await dependencies(context,auth.authorized),context.request.headers.get('cookie'),auth.email||'curator@institutional.internal'); return response(result,auth.authorized); }
  catch { return response({success:false,error:'Invalid request body.'},auth.authorized); }
}
