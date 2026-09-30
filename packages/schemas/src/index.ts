import { z } from 'zod';
const short = (max: number) => z.string().trim().min(1).max(max);
export const ChapterSchema = z.object({
  title: short(80), question: short(160),
  recall_keywords: z.array(short(40)).min(2).max(3).refine(v => new Set(v).size === v.length, 'Use distinct recall keywords'),
  landing: short(200), support: short(240).optional(),
  estimated_minutes: z.number().positive().max(60)
}).strict();
export const TalkMapSchema = z.object({
  title: short(120), one_message: short(240), story_arc: z.array(short(120)).min(1).max(12),
  chapters: z.array(ChapterSchema).min(1).max(12)
}).strict();
export const StoredTalkMapSchema = TalkMapSchema.extend({id: z.string().uuid(), revision: z.number().int().positive()});
export type TalkMap = z.infer<typeof TalkMapSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type StoredTalkMap = z.infer<typeof StoredTalkMapSchema>;
