import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language-provider";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  ensName: string | null;
  ensAvatar: string | null;
  displayName: string | null;
  usdcBalance: string | null;
  ethBalance: string | null;
  solBalance: string | null;
  user: User | null;
  connecting: boolean;
  connect: () => Promise<void>;
  connectFarcasterWallet: () => Promise<boolean>;
  disconnect: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Deterministic display name computation with proper priority
  const displayName = useMemo(() => {
    if (user?.farcasterUsername) return `@${user.farcasterUsername}`;
    if (user?.farcasterDisplayName) return user.farcasterDisplayName;
    if (ensName) return ensName;
    if (address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return null;
  }, [ensName, user?.farcasterUsername, user?.farcasterDisplayName, address]);

  const connectFarcasterWallet = async () => {
    try {
      setConnecting(true);
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const walletProvider = await sdk.wallet.getEthereumProvider();
      if (walletProvider) {
        const accounts = await walletProvider.request({
          method: "eth_requestAccounts",
        });
        
        if (accounts.length > 0) {
          const walletAddress = accounts[0];
          setAddress(walletAddress);
          setIsConnected(true);
          
          await resolveENS(walletAddress);
          await fetchBalances(walletAddress);
          await handleUserCreation(walletAddress);
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log("Farcaster wallet connection failed:", error);
      return false;
    } finally {
      setConnecting(false);
    }
  };


  const connect = async () => {
    try {
      setConnecting(true);
      
      // Connect only to Farcaster SDK wallet
      const farcasterSuccess = await connectFarcasterWallet();
      if (!farcasterSuccess) {
        throw new Error("Failed to connect Farcaster wallet");
      }
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: t('wallet.connectionFailed'),
        description: t('wallet.connectionFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setEnsName(null);
    setEnsAvatar(null);
    setUsdcBalance(null);
    setEthBalance(null);
    setSolBalance(null);
    setUser(null);
    toast({
      title: t('wallet.disconnected'),
      description: t('wallet.disconnectedDesc'),
    });
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) {
      throw new Error("No user connected");
    }

    try {
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, userData);
      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error: any) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  };

  const resolveENS = async (walletAddress: string) => {
    try {
      // Using ENS API to resolve address to name and avatar
      const response = await fetch(`https://api.ensideas.com/ens/resolve/${walletAddress}`);
      const data = await response.json();
      
      if (data.name) {
        setEnsName(data.name);
        
        // Try to get ENS avatar
        if (data.avatar) {
          setEnsAvatar(data.avatar);
        } else {
          // Try alternative ENS metadata API for avatar
          try {
            const metadataResponse = await fetch(`https://metadata.ens.domains/mainnet/avatar/${data.name}`);
            if (metadataResponse.ok) {
              const avatarUrl = metadataResponse.url;
              setEnsAvatar(avatarUrl);
            }
          } catch (avatarError) {
            console.log('No ENS avatar found');
          }
        }
        
        return data.name;
      }
    } catch (error) {
      console.log("No ENS name found for wallet address");
    }
    return null;
  };

  const fetchBalances = async (walletAddress: string) => {
    try {
      // USDC contract address on Base
      const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      
      // Fetch USDC balance
      const usdcResponse = await fetch('https://mainnet.base.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: USDC_CONTRACT_ADDRESS,
              data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}` // balanceOf function call
            },
            'latest'
          ],
          id: 1
        })
      });
      
      const usdcData = await usdcResponse.json();
      if (usdcData.result) {
        const balanceWei = BigInt(usdcData.result);
        const balance = (Number(balanceWei) / 1000000).toFixed(2); // USDC has 6 decimals
        setUsdcBalance(balance);
      }
      
      // Fetch ETH balance
      const ethResponse = await fetch('https://mainnet.base.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [walletAddress, 'latest'],
          id: 2
        })
      });
      
      const ethData = await ethResponse.json();
      if (ethData.result) {
        const balanceWei = BigInt(ethData.result);
        const balance = (Number(balanceWei) / 1e18).toFixed(4); // ETH has 18 decimals
        setEthBalance(balance);
      }

      // SOL balance (simulated for demo - EVM wallets don't typically hold SOL)
      setSolBalance('0.0000');
    } catch (error) {
      console.error('Error fetching balances:', error);
      setUsdcBalance('0.00');
      setEthBalance('0.0000');
      setSolBalance('0.0000');
    }
  };

  const handleUserCreation = async (walletAddress: string) => {
    try {
      const response = await apiRequest("GET", `/api/users/${walletAddress}`);
      const userData = await response.json();
      setUser(userData);
      
      // If user exists but doesn't have Farcaster FID, try to fetch it
      if (!userData.farcasterFid) {
        await fetchAndUpdateFarcasterData(walletAddress, userData.id);
      }
    } catch (error: any) {
      if (error.message.includes("404")) {
        // Fetch Farcaster data first
        let farcasterData = null;
        try {
          const farcasterResponse = await apiRequest("GET", `/api/farcaster/user-by-wallet/${walletAddress}`);
          farcasterData = await farcasterResponse.json();
        } catch (farcasterError) {
          console.log("No Farcaster account found for this wallet");
        }

        // Create new user with or without Farcaster data
        const newUserData = {
          walletAddress,
          farcasterFid: farcasterData?.fid?.toString() || null,
          farcasterUsername: farcasterData?.username || null,
          farcasterDisplayName: farcasterData?.displayName || null,
          farcasterAvatar: farcasterData?.pfpUrl || null,
        };

        const response = await apiRequest("POST", "/api/users", newUserData);
        const userData = await response.json();
        setUser(userData);
      } else {
        throw error;
      }
    }
  };

  const fetchAndUpdateFarcasterData = async (walletAddress: string, userId: string) => {
    try {
      const farcasterResponse = await apiRequest("GET", `/api/farcaster/user-by-wallet/${walletAddress}`);
      const farcasterData = await farcasterResponse.json();
      
      if (farcasterData?.fid) {
        // Update user with Farcaster data
        const updates = {
          farcasterFid: farcasterData.fid.toString(),
          farcasterUsername: farcasterData.username || null,
          farcasterDisplayName: farcasterData.displayName || null,
          farcasterAvatar: farcasterData.pfpUrl || null,
        };
        
        const response = await apiRequest("PATCH", `/api/users/${userId}`, updates);
        const updatedUser = await response.json();
        setUser(updatedUser);
        
        toast({
          title: t('wallet.farcasterLinked'),
          description: t('wallet.farcasterLinkedDesc').replace('{username}', farcasterData.username),
        });
        console.log("Farcaster data automatically linked to account");
      }
    } catch (error) {
      console.log("No Farcaster account found for this wallet address");
    }
  };

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      // First try Farcaster SDK wallet for auto-connect
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const walletProvider = await sdk.wallet.getEthereumProvider();
        if (walletProvider) {
          const accounts = await walletProvider.request({
            method: "eth_accounts",
          });
          
          if (accounts.length > 0) {
            const walletAddress = accounts[0];
            setAddress(walletAddress);
            setIsConnected(true);
            
            await resolveENS(walletAddress);
            await fetchBalances(walletAddress);
            await handleUserCreation(walletAddress);
            return;
          }
        }
      } catch (farcasterError) {
        console.log("Farcaster wallet not available for auto-connect");
      }

    };

    checkConnection();
  }, []);

  const value = {
    isConnected,
    address,
    ensName,
    ensAvatar,
    displayName,
    usdcBalance,
    ethBalance,
    solBalance,
    user,
    connecting,
    connect,
    connectFarcasterWallet,
    disconnect,
    updateUser,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// Extend window type for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
