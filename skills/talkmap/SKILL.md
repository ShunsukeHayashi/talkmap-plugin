---
name: talkmap
description: Turn supplied source context into short memory-triggering speaking cards for talks or voice recordings.
---
# TalkMap
Read the user's context and intended audience. Identify one message and a story arc, then 1–12 chapters.
Each chapter expresses one central idea through a short title, one question, 2–3 distinct recall keywords, one landing, optional short source-grounded support, and positive estimated_minutes.
Use the user's language. Never write a full script by default. Do not invent examples, quotations, or personal experiences. Ask for essential missing context; label estimates as estimates.
Call create_talkmap with source_context and the synthesized talkmap. The server validates structure; it does not perform AI inference or verify source fidelity.
For edits, call get_talkmap, then revise_chapter with the latest expected_revision and a full replacement chapter.
For simpler speaking cards, preserve the ideas and chapter count, shorten wording, then call simplify_for_speaking with all chapters and expected_revision.
Maps exist only in the current MCP session and disappear on restart or expiry. Keep map contents in the conversation so they can be recreated. Never promise permanent storage.
