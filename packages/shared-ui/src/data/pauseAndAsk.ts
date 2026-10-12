/**
 * Pause & Ask engine - Kids Devotion TV (C024)
 * Pure logic, no UI deps. Given a catalog + playback position,
 * returns the questions for the current scene and answers with
 * source badges, at kid/adult level, in English or Hindi.
 * Kid-safe refusal: a question outside the authored set returns
 * a gentle "not yet" instead of an invented answer.
 */

export type Lang = "en" | "hi";
export type Level = "kid" | "adult";
export type Badge = "SP" | "MB" | "MT" | "Popular" | "Hedged";

export interface QA {
  q_en: string; q_hi: string;
  answer_kid_en: string; answer_kid_hi: string;
  answer_adult_en: string; answer_adult_hi: string;
  source_badge: Badge; source_note: string;
}
export interface Scene {
  scene_id: string; start_sec: number; end_sec: number;
  characters: string[]; questions: QA[];
}
export interface CatalogItemWithScenes {
  id: string; title_en: string; title_hi: string;
  type: "film" | "song"; duration_sec: number;
  video_url: string; poster: string; age_band: "kids" | "family";
  festival_tags: string[]; scenes: Scene[];
}
export interface Catalog { items: CatalogItemWithScenes[] }

export const NOT_YET: Record<Lang, string> = {
  en: "I don't know that story yet. Let us keep watching together.",
  hi: "Mujhe yeh katha abhi nahi aati. Aao, aage saath dekhte hain.",
};

export function sceneAt(item: CatalogItemWithScenes, tSec: number): Scene | null {
  return item.scenes.find(s => tSec >= s.start_sec && tSec < s.end_sec) ?? null;
}

export function questionsAt(item: CatalogItemWithScenes, tSec: number): QA[] {
  return sceneAt(item, tSec)?.questions ?? [];
}

export function answer(qa: QA, level: Level, lang: Lang): {
  text: string; badge: Badge; source_note: string;
} {
  const key = `answer_${level}_${lang}` as const;
  return { text: qa[key], badge: qa.source_badge, source_note: qa.source_note };
}

/** Free-text ask: match only authored questions (exact-ish). No invention. */
export function askFreeText(item: CatalogItemWithScenes, tSec: number, text: string, level: Level, lang: Lang) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const needle = norm(text);
  const hit = questionsAt(item, tSec).find(
    qa => norm(qa.q_en) === needle || norm(qa.q_hi) === needle
  );
  if (!hit) return { text: NOT_YET[lang], badge: null as null, source_note: "" };
  return answer(hit, level, lang);
}

/** Festival-aware home row: items tagged for a festival come first. */
export function homeRow(catalog: { items: CatalogItemWithScenes[] }, festival: string | null): CatalogItemWithScenes[] {
  if (!festival) return [...catalog.items];
  const tagged = catalog.items.filter(i => i.festival_tags.includes(festival));
  const rest = catalog.items.filter(i => !i.festival_tags.includes(festival));
  return [...tagged, ...rest];
}
