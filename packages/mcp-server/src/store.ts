import { randomUUID } from 'node:crypto';
import { ChapterSchema, TalkMapSchema, type TalkMap, type Chapter, type StoredTalkMap } from '@talkmap/schemas';
export class TalkMapStore {
  private maps = new Map<string, StoredTalkMap>();
  create(map: TalkMap): StoredTalkMap {
    if (this.maps.size >= 50) throw new Error('Session limit reached (50 maps). Start a new session.');
    const result = { ...TalkMapSchema.parse(map), id: randomUUID(), revision: 1 };
    this.maps.set(result.id, result); return structuredClone(result);
  }
  get(id: string): StoredTalkMap {
    const result = this.maps.get(id);
    if (!result) throw new Error('TalkMap not found in this session. Recreate it from the conversation.');
    return structuredClone(result);
  }
  revise(id: string, index: number, chapter: Chapter, revision: number): StoredTalkMap {
    const current = this.get(id);
    if (current.revision !== revision) throw new Error('Revision conflict. Fetch the latest TalkMap before editing.');
    if (!Number.isInteger(index) || !current.chapters[index]) throw new Error('Chapter index out of range.');
    current.chapters[index] = ChapterSchema.parse(chapter); current.revision++;
    this.maps.set(id,current); return structuredClone(current);
  }
  simplify(id: string, chapters: Chapter[], revision: number): StoredTalkMap {
    const current = this.get(id);
    if (current.revision !== revision) throw new Error('Revision conflict. Fetch the latest TalkMap before editing.');
    if (chapters.length !== current.chapters.length) throw new Error('Keep the same chapter count.');
    for (const [i, chapter] of chapters.entries()) {
      const old = current.chapters[i]!;
      const words = (c: Chapter) => [c.title,c.question,...c.recall_keywords,c.landing,c.support ?? ''].join('').length;
      if (words(chapter) > words(old)) throw new Error('Simplified chapters must not be longer.');
    }
    current.chapters = chapters.map(c => ChapterSchema.parse(c)); current.revision++;
    this.maps.set(id,current); return structuredClone(current);
  }
}
