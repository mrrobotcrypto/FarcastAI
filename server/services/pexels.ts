interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
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

interface PexelsSearchResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

export class PexelsService {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/v1';

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY || '';
    if (!this.apiKey) {
      throw new Error('PEXELS_API_KEY environment variable is required');
    }
  }

  async searchPhotos(query: string, perPage: number = 6): Promise<PexelsPhoto[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data: PexelsSearchResponse = await response.json();
      return data.photos;
    } catch (error) {
      console.error('Error searching Pexels photos:', error);
      throw new Error('Failed to search photos from Pexels');
    }
  }

  async getFeaturedPhotos(perPage: number = 6): Promise<PexelsPhoto[]> {
    try {
      // Use crypto-related search terms with rotation based on date
      const cryptoTerms = [
        'cryptocurrency bitcoin',
        'blockchain technology',
        'digital currency',
        'ethereum trading',
        'crypto investment',
        'bitcoin mining',
        'blockchain network',
        'cryptocurrency exchange'
      ];
      
      // Rotate search term daily
      const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const selectedTerm = cryptoTerms[dayOfYear % cryptoTerms.length];
      
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(selectedTerm)}&per_page=${perPage}&orientation=landscape`,
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data: PexelsSearchResponse = await response.json();
      return data.photos;
    } catch (error) {
      console.error('Error fetching featured Pexels photos:', error);
      throw new Error('Failed to fetch featured photos from Pexels');
    }
  }
}

export const pexelsService = new PexelsService();
