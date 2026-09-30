# TalkMap — Agent Instructions

Read this file before every task.

## Product

TalkMap turns source context into memory-triggering speaking cards.

It must NOT generate long scripts by default. The speaker talks from memory;
cards only trigger recall.

Core structure:

Context
→ One Message
→ Story Arc
→ Chapters
→ One Question
→ 2–3 Recall Keywords
→ Landing

## Architecture

- Monorepo: pnpm workspaces, TypeScript (strict)
- `packages/schemas` — Zod schemas (single source of truth for types)
- `packages/mcp-server` — MCP server (current MCP Apps SDK), exposes tools + widget resource
- `apps/widget` — React (Vite) widget rendered inside ChatGPT
- `skills/talkmap` — skill/prompt assets describing how to build a TalkMap
- No database in MVP
- No authentication in MVP
- No image-generation model for cards
- Render cards deterministically with HTML/CSS

## MCP tools (MVP)

- `create_talkmap` — source context → TalkMap
- `get_talkmap` — return a TalkMap by id (in-memory store for MVP)
- `revise_chapter` — rewrite one chapter, keeping the chapter invariant
- `simplify_for_speaking` — shorten wording for speaking mode

## Schemas

TalkMap:
- `title`
- `one_message`
- `story_arc`
- `chapters[]`

Chapter:
- `title`
- `question`
- `recall_keywords` (2–3, enforced by schema)
- `landing`
- `support` (optional, short)
- `estimated_minutes`

## Chapter invariant

Each chapter must contain:
- one central idea
- one question
- 2–3 recall keywords
- one landing

Reject or repair any output that violates this.

## UI

- Speaking Mode must be mobile-first (one chapter per screen, large type, swipe/tap to advance)
- Keywords are the visual anchor; supporting text is secondary

## Commands

- Install: `pnpm install`
- Build: `pnpm build`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`

## Quality gates

Before completing a task:
1. run typecheck
2. run tests
3. run build
4. report any remaining failures

## Rules

- Never commit secrets. Read credentials only from environment variables.
- Do not deploy unless the task explicitly says so.
- Keep changes scoped to the task; commit with clear messages.
