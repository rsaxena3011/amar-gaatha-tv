// Catalog API types
export type CatalogItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  genres: string[];
  trending: boolean;
  rating_count: number;
  rating_stars: number;
  content_rating: string;
  release_year: number;
  duration_sec: number;
  images: {
    poster_16x9: string;
  };
  sources: Array<{
    type: string;
    url: string;
  }>;
  description: string;
};

export type CatalogResponse = {
  catalog_version: string;
  updated_at: string;
  items: CatalogItem[];
};

// Simplified card data for UI components
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

const CATALOG_URL = 'https://giolaq.github.io/scrap-tv-feed/catalog.json';

// Transform catalog item to CardData format
export const transformCatalogItem = (item: CatalogItem): CardData => {
  const videoSource = item.sources.find(s => s.type === 'video/mp4') || item.sources[0];

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    headerImage: item.images.poster_16x9,
    movie: videoSource?.url || '',
    duration: item.duration_sec,
    category: item.category,
    genres: item.genres,
    releaseYear: item.release_year,
    rating: item.rating_stars,
    ratingCount: item.rating_count,
    contentRating: item.content_rating,
    trending: item.trending,
  };
};

// Fetch movies from catalog
export const fetchMoviesData = async (): Promise<CardData[]> => {
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: CatalogResponse = await response.json();
    return data.items.map(transformCatalogItem);
  } catch (error) {
    console.error('Failed to fetch movies catalog:', error);
    throw error;
  }
};

// --- Amar Gaatha TV (C024): owned content, adapted to CardData ---

export const amarGaathaCards = (festival: string | null = null): CardData[] => {
  const ordered = homeRow({ items: amarGaathaCatalog }, festival);
  return ordered.map((item) => ({
    id: item.id,
    title: item.title_en,
    description: item.title_hi,
    headerImage: item.poster,
    movie: item.video_url,
    duration: item.duration_sec,
    category: 'Amar Gaatha',
    genres: item.festival_tags,
    releaseYear: 2026,
    rating: 5,
    ratingCount: 1,
    contentRating: 'Family',
    trending: true,
  }));
};

// Empty array as placeholder - movies will be fetched dynamically
export const moviesData: CardData[] = [];
