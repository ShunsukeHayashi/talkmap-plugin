import { z } from 'zod';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TalkMapSchema, StoredTalkMapSchema } from '@talkmap/schemas';
import { createTalkMapServer, WIDGET_URI } from './server.js';
import { TalkMapStore } from './store.js';
import { createHttpServer } from './http.js';
const chapter={title:'まず試す',question:'最初に何を試す？',recall_keywords:['小さく','確認'],landing:'小さく試して確認する。',support:'一つの作業から始める。',estimated_minutes:2};
const map={title:'AIの始め方',one_message:'小さく試す',story_arc:['課題','試す'],chapters:[chapter]};
test('chapter invariants reject invalid counts, empty prompts and excessive prose',()=>{
  for(const change of [{recall_keywords:['一つ']},{recall_keywords:['a','a']},{question:' '},{landing:'x'.repeat(201)},{estimated_minutes:0}]) assert.equal(TalkMapSchema.safeParse({...map,chapters:[{...chapter,...change}]}).success,false);
});
test('store copies isolate mutations and rejects stale or longer edits',()=>{
  const store=new TalkMapStore();const created=store.create(map);created.chapters[0]!.title='changed';
  assert.equal(store.get(created.id).chapters[0]!.title,chapter.title);
  assert.throws(()=>store.revise(created.id,4,chapter,1));
  store.revise(created.id,0,chapter,1);assert.throws(()=>store.revise(created.id,0,chapter,1));
  assert.throws(()=>store.simplify(created.id,[{...chapter,support:'a'.repeat(240)}],2));
  assert.throws(()=>new TalkMapStore().get(created.id));
});
async function exercise(client:Client){
  assert.equal((await client.listTools()).tools.length,4);
  const resource=await client.readResource({uri:WIDGET_URI});assert.ok(resource.contents.length);
  const created=await client.callTool({name:'create_talkmap',arguments:{source_context:'一つの作業から小さく試す。',talkmap:map}});
  const saved=z.object({talkmap:StoredTalkMapSchema}).parse(created.structuredContent).talkmap;
  const got=await client.callTool({name:'get_talkmap',arguments:{id:saved.id}});assert.deepEqual(got.structuredContent,created.structuredContent);
  const revised=await client.callTool({name:'revise_chapter',arguments:{id:saved.id,chapter_index:0,expected_revision:1,chapter:{...chapter,title:'一つ試す'}}});assert.equal(z.object({talkmap:StoredTalkMapSchema}).parse(revised.structuredContent).talkmap.revision,2);
  const simplified=await client.callTool({name:'simplify_for_speaking',arguments:{id:saved.id,expected_revision:2,chapters:[{...chapter,title:'試す',support:undefined}]}});assert.equal(z.object({talkmap:StoredTalkMapSchema}).parse(simplified.structuredContent).talkmap.revision,3);
  const stale=await client.callTool({name:'revise_chapter',arguments:{id:saved.id,chapter_index:0,expected_revision:1,chapter}});assert.equal(stale.isError,true);
  return saved.id;
}
test('four tools and resource work over MCP transport',async()=>{
  const server=createTalkMapServer('<html>Speaking Mode</html>');const client=new Client({name:'test',version:'1'});
  const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
  try {await exercise(client);}finally{await client.close();await server.close();}
});
test('HTTP MCP roundtrip, session isolation and origin protection',async()=>{
  const http=createHttpServer('<html>Speaking Mode</html>');await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve));
  const address=http.address();assert.ok(address && typeof address!=='string');const url=new URL(`http://127.0.0.1:${address.port}/mcp`);
  const clients=[new Client({name:'a',version:'1'}),new Client({name:'b',version:'1'})];
  const transports=clients.map(()=>new StreamableHTTPClientTransport(url));
  try{
    for(let i=0;i<clients.length;i++) await clients[i]!.connect(transports[i]!);
    const id=await exercise(clients[0]!);
    assert.equal((await clients[1]!.callTool({name:'get_talkmap',arguments:{id}})).isError,true);
    assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);
    assert.equal((await fetch(url,{method:'POST',body:'invalid'})).status,400);
  }finally{for(const t of transports){await t.terminateSession();await t.close();}await new Promise<void>(resolve=>http.close(()=>resolve()));}
});

test('built widget is served as a self-contained MCP Apps resource',async()=>{
  const server=createTalkMapServer();const client=new Client({name:'bundle-check',version:'1'});
  const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
  try { const result=await client.readResource({uri:WIDGET_URI});
    const content=result.contents[0];assert.ok(content && 'text' in content);
    assert.equal(content.mimeType,'text/html;profile=mcp-app');
    assert.match(content.text,/<script type="module"/);assert.match(content.text,/SPEAKING MODE/);
    assert.doesNotMatch(content.text,/<script[^>]+src=/);
  } finally {await client.close();await server.close();}
});
