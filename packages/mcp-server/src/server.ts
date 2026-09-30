import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { TalkMapSchema, ChapterSchema, StoredTalkMapSchema, type StoredTalkMap } from '@talkmap/schemas';
import { TalkMapStore } from './store.js';
export const WIDGET_URI = 'ui://talkmap/speaking.html';
export function createTalkMapServer(html?: string) {
  const server = new McpServer({name:'talkmap',version:'0.1.0'});
  const store = new TalkMapStore();
  registerAppResource(server,'speaking-mode',WIDGET_URI,{},async () => ({contents:[{
    uri:WIDGET_URI,mimeType:RESOURCE_MIME_TYPE,
    text:html ?? readFileSync(new URL('../../../apps/widget/dist/index.html', import.meta.url),'utf8'),
    _meta:{ui:{csp:{connectDomains:[],resourceDomains:[]}}}
  }]}));
  const identity = { id: z.string().uuid() };
  const edit = {...identity, expected_revision:z.number().int().positive()};
  function add(name: string, description: string, inputSchema: z.ZodRawShape, action: (args: Record<string, unknown>) => StoredTalkMap, readOnly = false) {
    registerAppTool(server,name,{title:name.replaceAll('_',' '),description,inputSchema,
      outputSchema:{talkmap:StoredTalkMapSchema},
      annotations:{readOnlyHint:readOnly,destructiveHint:false,openWorldHint:false,idempotentHint:readOnly},
      _meta:{ui:{resourceUri:WIDGET_URI}}},async args => {
        try { const talkmap = action(args); return {content:[{type:'text' as const,text:JSON.stringify(talkmap)}],structuredContent:{talkmap}}; }
        catch(error) {return {isError:true,content:[{type:'text' as const,text:error instanceof Error ? error.message : 'Invalid TalkMap'}]};}
      });
  }
  add('create_talkmap','First synthesize concise speaking cards from source_context using the TalkMap skill. Pass the complete map; the server validates and stores it, without separate AI inference. Do not invent source facts.',
    {source_context:z.string().trim().min(1).max(20000),talkmap:TalkMapSchema},args => store.create(TalkMapSchema.parse(args.talkmap)));
  add('get_talkmap','Fetch a TalkMap from the current connection session. Maps expire when the session ends or server restarts.',identity,args => store.get(String(args.id)),true);
  add('revise_chapter','Provide a complete replacement for one zero-based chapter, grounded in the conversation. Fetch latest revision first.',
    {...edit,chapter_index:z.number().int().min(0),chapter:ChapterSchema},args => store.revise(String(args.id),Number(args.chapter_index),ChapterSchema.parse(args.chapter),Number(args.expected_revision)));
  add('simplify_for_speaking','Rewrite the existing chapters into shorter recall prompts without changing their meaning or count. Provide all simplified chapters; no automatic string truncation.',
    {...edit,chapters:z.array(ChapterSchema).min(1).max(12)},args => store.simplify(String(args.id),z.array(ChapterSchema).parse(args.chapters),Number(args.expected_revision)));
  return server;
}
