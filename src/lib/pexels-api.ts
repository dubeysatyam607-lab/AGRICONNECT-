/**
 * Pexels Agricultural Image Integration Service
 * Serves high-resolution, verified farming & agricultural photos
 */

const PEXELS_API_KEY = (import.meta.env.VITE_PEXELS_API_KEY as string | undefined)?.trim();

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

const PEXELS_CACHE_KEY = 'agri_pexels_cache_v1';

function getPexelsCache(): Record<string, PexelsPhoto[]> {
  try {
    return JSON.parse(localStorage.getItem(PEXELS_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setPexelsCache(query: string, photos: PexelsPhoto[]) {
  try {
    const cache = getPexelsCache();
    cache[query] = photos;
    localStorage.setItem(PEXELS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage quota safeguard
  }
}

export async function searchAgriImages(query: string = "indian agriculture farming", perPage: number = 10): Promise<PexelsPhoto[]> {
  const cache = getPexelsCache();
  if (cache[query] && cache[query].length >= perPage) {
    return cache[query].slice(0, perPage);
  }

  try {
    if (!PEXELS_API_KEY) {
      console.warn('[Pexels Service] VITE_PEXELS_API_KEY is not set; using fallback imagery.');
      return getFallbackAgriPhotos();
    }
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Pexels API error: ${res.statusText}`);
    }

    const data = await res.json();
    const photos: PexelsPhoto[] = data.photos || [];
    if (photos.length > 0) {
      setPexelsCache(query, photos);
    }
    return photos;
  } catch (err) {
    console.warn('[Pexels Service] Request failed, using fallback imagery:', err);
    return getFallbackAgriPhotos();
  }
}

export function getFallbackAgriPhotos(): PexelsPhoto[] {
  return [
    {
      id: 101,
      width: 1200,
      height: 800,
      url: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
      photographer: "AgriConnect Media",
      src: {
        original: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        large2x: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
        large: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=600",
        medium: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=400",
        small: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=200",
        portrait: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        landscape: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        tiny: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=100",
      },
      alt: "Green Wheat Field Agriculture"
    },
    {
      id: 102,
      width: 1200,
      height: 800,
      url: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
      photographer: "AgriConnect Media",
      src: {
        original: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
        large2x: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800",
        large: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=600",
        medium: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=400",
        small: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=200",
        portrait: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
        landscape: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
        tiny: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=100",
      },
      alt: "Indian Farmer Harvesting Crop"
    }
  ];
}
