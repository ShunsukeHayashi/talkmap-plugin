import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { pathToFileURL } from 'node:url';
import { createTalkMapServer } from './server.js';
export function createHttpServer(html?: string): Server {
  const sessions = new Map<string, {transport: StreamableHTTPServerTransport; server: ReturnType<typeof createTalkMapServer>; touched:number}>();
  const http = createServer(async (req,res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const hostname = (req.headers.host ?? '').split(':')[0];
    if (!['localhost','127.0.0.1'].includes(hostname!)) {res.writeHead(403).end('Invalid host');return;}
    if (req.headers.origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin)) {res.writeHead(403).end('Invalid origin');return;}
    if (url.pathname === '/' && req.method === 'GET') {res.writeHead(200,{'Content-Type':'application/json'}).end('{"status":"ok","storage":"session-memory"}');return;}
    if (url.pathname !== '/mcp') {res.writeHead(404).end('Not found');return;}
    if (req.method === 'OPTIONS') {res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, DELETE','Access-Control-Allow-Headers':'Content-Type, mcp-session-id, mcp-protocol-version','Access-Control-Allow-Origin':req.headers.origin ?? 'http://localhost'}).end();return;}
    for (const [id,entry] of sessions) if (Date.now()-entry.touched>30*60*1000) {sessions.delete(id);await entry.server.close();}
    try {
      const id = req.headers['mcp-session-id'];
      let entry = typeof id === 'string' ? sessions.get(id) : undefined;
      let body: unknown;
      if (req.method === 'POST') {
        const chunks: Buffer[]=[];let length=0;
        for await (const chunk of req) {length+=chunk.length;if(length>256000){res.writeHead(413).end('Payload too large');return;}chunks.push(Buffer.from(chunk));}
        try {body=JSON.parse(Buffer.concat(chunks).toString());} catch {res.writeHead(400).end('Invalid JSON');return;}
      }
      if (!entry) {
        if (id) {res.writeHead(404).end('Session expired');return;}
        if (req.method!=='POST' || !isInitializeRequest(body)) {res.writeHead(400).end('Initialize an MCP session first');return;}
        if(sessions.size>=100){res.writeHead(503).end('Session capacity reached');return;}
        const server=createTalkMapServer(html);
        const transport=new StreamableHTTPServerTransport({sessionIdGenerator:()=>randomUUID(),enableJsonResponse:true,
          onsessioninitialized:sessionId=>{sessions.set(sessionId,{transport,server,touched:Date.now()});}});
        transport.onclose=()=>{if(transport.sessionId) sessions.delete(transport.sessionId);};
        await server.connect(transport);entry={transport,server,touched:Date.now()};
      }
      entry.touched=Date.now();await entry.transport.handleRequest(req,res,body);
    } catch {if(!res.headersSent) res.writeHead(500).end('MCP request failed');}
  });
  http.on('close',()=>{for(const entry of sessions.values()) void entry.server.close();sessions.clear();});
  return http;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT ?? 8787);
  const http=createHttpServer();http.listen(port,'127.0.0.1',()=>console.log(`TalkMap: http://127.0.0.1:${port}/mcp`));
  for(const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,()=>http.close());
}
