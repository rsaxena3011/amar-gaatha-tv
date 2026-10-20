// --- Amar Gaatha TV (C024): owned content, adapted to CardData ---
import { amarGaathaCatalog } from './amarGaathaCatalog';
import { homeRow } from './pauseAndAsk';

export type CardData = {
  id: string | number;
  title: string;
  description: string;
  headerImage: string;
  movie: string;
  duration?: number;
  category?: string;
  genres?: string[];
  releaseYear?: number;
  rating?: number;
  ratingCount?: number;
  contentRating?: string;
  trending?: boolean;
};

export const amarGaathaCards = (festival: string | null = null): CardData[] => {
  const ordered = homeRow({ items: amarGaathaCatalog }, festival);
  return ordered.map((item) => ({
    id: item.id,
    title: item.title_en,
    description: item.title_hi,
    headerImage: item.poster,
    movie: item.video_url,
    duration: item.duration_sec,
    category: 'Kids Devotion',
    genres: item.festival_tags,
    releaseYear: 2026,
    rating: 5,
    ratingCount: 1,
    contentRating: 'Family',
    trending: true,
  }));
};
