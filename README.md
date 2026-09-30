# TalkMap

Source context → memory-triggering speaking cards, as a ChatGPT MCP app.

See [AGENTS.md](./AGENTS.md) for product rules, architecture and quality gates.

## Layout

```
apps/widget          React widget (Speaking Mode)
packages/mcp-server  MCP server (tools + widget resource)
packages/schemas     Zod schemas
skills/talkmap       TalkMap skill assets
```

## Codex Cloud environment (`talkmap-dev`)

Setup script:

```sh
corepack enable
pnpm install
```

(Add `pnpm build && pnpm test` once packages exist.)

Network allowlist (minimum): `registry.npmjs.org`, `github.com`, `api.github.com`,
plus your deploy target (`api.cloudflare.com` or `api.vercel.com`).

Secrets (set in the environment, never in the repo):
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — or `VERCEL_TOKEN`.
