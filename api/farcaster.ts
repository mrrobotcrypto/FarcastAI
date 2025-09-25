interface FarcasterCastRequest {
  text: string;
  embeds?: Array<{
    url?: string;
    castId?: {
      fid: number;
      hash: string;
    };
  }>;
  embedsDeprecated?: string[];
  mentions?: number[];
  mentionsPositions?: number[];
}

interface FarcasterCastResponse {
  hash: string;
  success: boolean;
}

export class FarcasterService {
  private hubUrl: string;
  private warpcastApiUrl: string;

  constructor() {
    // Using Farcaster Hub API for direct casting
    this.hubUrl = process.env.FARCASTER_HUB_URL || 'https://hub.farcaster.xyz';
    this.warpcastApiUrl = 'https://api.warpcast.com';
  }

  async prepareCast(
    fid: string, 
    text: string, 
    imageUrl?: string
  ): Promise<{ castContent: string; farcasterUrl: string; ready: boolean }> {
    try {
      // Prepare cast for manual submission
      console.log('Preparing Farcaster cast for FID:', fid);
      console.log('Cast content:', text);
      if (imageUrl) {
        console.log('With image:', imageUrl);
      }
      
      // Simulate preparation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create direct Farcaster cast URL for manual posting
      const encodedText = encodeURIComponent(text);
      let farcasterUrl = `https://warpcast.com/~/compose?text=${encodedText}`;
      
      if (imageUrl) {
        const encodedImage = encodeURIComponent(imageUrl);
        farcasterUrl += `&embeds[]=${encodedImage}`;
      }
      
      return {
        castContent: text,
        farcasterUrl,
        ready: true,
      };
    } catch (error) {
      console.error('Error preparing cast:', error);
      throw new Error('Failed to prepare cast for Farcaster');
    }
  }

  async getUserProfile(fid: string): Promise<any> {
    try {
      const response = await fetch(`${this.hubUrl}/v1/userDataByFid?fid=${fid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Farcaster user profile:', error);
      throw new Error('Failed to fetch user profile from Farcaster');
    }
  }

  async getUserByWalletAddress(walletAddress: string): Promise<any> {
    try {
      // Using Warpcast API to get user by connected wallet address
      const response = await fetch(`${this.warpcastApiUrl}/v2/user-by-verification?address=${walletAddress}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found on Farcaster
        }
        throw new Error(`Failed to fetch user by wallet: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        fid: data.result?.user?.fid,
        username: data.result?.user?.username,
        displayName: data.result?.user?.displayName,
        pfpUrl: data.result?.user?.pfp?.url,
      };
    } catch (error) {
      console.error('Error fetching Farcaster user by wallet:', error);
      return null; // Return null instead of throwing to allow user creation without Farcaster
    }
  }
}

export const farcasterService = new FarcasterService();
