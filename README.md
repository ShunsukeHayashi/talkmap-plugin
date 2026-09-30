# TalkMap

Turn source context into memory-triggering speaking cards in a ChatGPT MCP widget. A working local MVP; not deployed or submitted for public distribution.

## Repository root

Run every command from this checkout's root (the directory containing `AGENTS.md`, `package.json`, and `pnpm-workspace.yaml`). Do not create a nested checkout.

```
apps/widget          React / Vite single-file Speaking Mode widget
packages/mcp-server  Streamable HTTP MCP, session-scoped in-memory store
packages/schemas     Strict Zod schemas shared by server and UI
skills/talkmap       Instructions for source-grounded card synthesis
```

## Run locally

Requires Node.js >=20 and pnpm 9.12.0.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

Endpoint: `http://127.0.0.1:8787/mcp`. Health: `http://127.0.0.1:8787/`.
Set `PORT` to change the port. `pnpm preview:widget` runs the Vite development UI; without an MCP host it shows a connection status, not fake cards.

```sh
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

The tests run actual MCP client calls through both in-memory and HTTP transports. They cover all four tools, resource loading, input invariants, optimistic revisions, session isolation, and invalid origins.

## Tool flow

1. ChatGPT synthesizes a concise `talkmap` from supplied `source_context`, following `skills/talkmap/SKILL.md`, then calls `create_talkmap`. There is no separate model/API invocation inside this server. Source context is validated but not stored; source fidelity still requires human/model review.
2. `get_talkmap({id})` returns the current session's map.
3. `revise_chapter({id, chapter_index, chapter, expected_revision})` replaces a complete chapter. Indices start at zero.
4. `simplify_for_speaking({id, chapters, expected_revision})` accepts the model's shorter chapter wording, preserving chapter count. The server verifies structure and that wording length does not increase; semantic preservation is a model/reviewer responsibility.

Every successful tool returns `{talkmap: {id, revision, title, one_message, story_arc, chapters}}` and links `ui://talkmap/speaking.html`. Each chapter has title, question, 2–3 distinct recall keywords, landing, optional support, and estimated_minutes. Speaking Mode shows one chapter at a time with swipe/tap navigation, prominent keywords, expandable support, and estimated duration.

## Inspector and ChatGPT

```sh
npx @modelcontextprotocol/inspector@latest
```

Choose Streamable HTTP and connect to `http://127.0.0.1:8787/mcp`. Inspect tools/resources, create a map with the complete schema, and call the remaining tools using its returned ID/revision. For the UI, connect through an MCP Apps-capable host; Inspector tool success alone does not prove ChatGPT rendering.

Follow the [official MCP app quickstart](https://developers.openai.com/plugins/build/app-quickstart) for developer-mode connections. This prototype intentionally binds loopback and validates loopback Host/Origin headers. Public tunnels and serverless deployment need an explicit hosting/security adaptation; do not expose the current prototype as a production service.

## Storage boundaries

No database, login, image generation, analytics, or external inference. Maps are scoped to an MCP transport session, with a maximum of 50 maps per session and 100 active sessions. Sessions expire after 30 minutes without HTTP requests (cleaned on the next request). Restarting the process loses all maps. IDs are not durable; use conversation contents to recreate maps. Request bodies are limited to 256 KB. Session isolation is not user authentication.

## Codex Cloud (`talkmap-dev`)

Use the attached GitHub repository as the environment's repository. Setup script:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

Task checks: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`.
Network setup needs npm registry access for installation. GitHub access is needed for repository operations. No deployment credentials are needed for this implementation. Creating/publishing a Codex Cloud environment, production hosting, ChatGPT connection testing, and plugin submission remain separate steps.
