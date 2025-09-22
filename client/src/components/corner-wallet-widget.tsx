import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Wallet, 
  User, 
  LogOut, 
  Check,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language-provider";

export function CornerWalletWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnectMenuOpen, setIsConnectMenuOpen] = useState(false);
  const { isConnected, address, ensName, ensAvatar, displayName, user, connecting, connect, connectFarcasterWallet, disconnect, usdcBalance, ethBalance, solBalance } = useWallet();
  const { t } = useLanguage();
  const { toast } = useToast();


  const handleFarcasterConnect = async () => {
    setIsConnectMenuOpen(false);
    try {
      const success = await connectFarcasterWallet();
      if (success) {
        toast({
          title: t('wallet.farcasterConnected'),
          description: t('wallet.farcasterConnectedDesc'),
        });
      } else {
        throw new Error("Failed to connect Farcaster wallet");
      }
    } catch (error) {
      console.error("Farcaster connection failed:", error);
      toast({
        title: t('wallet.connectionFailed'),
        description: t('wallet.connectionFailedDesc'),
        variant: "destructive",
      });
    }
  };


  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
    toast({
      title: t('wallet.disconnected'),
      description: t('wallet.disconnectedDesc'),
    });
  };

  const getDisplayName = () => {
    // Priority: Farcaster username > Farcaster display name > ENS name > shortened address
    if (user?.farcasterUsername) return `@${user.farcasterUsername}`;
    if (user?.farcasterDisplayName) return user.farcasterDisplayName;
    if (ensName) return ensName;
    if (displayName) return displayName;
    if (address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return t('wallet.unknown');
  };

  // Connected state - show username
  if (isConnected && address) {
    return (
      <div className="md:fixed md:top-4 md:right-24 z-50">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-background/95 backdrop-blur-sm border border-border hover:bg-accent/10 transition-all duration-200 shadow-lg"
              data-testid="button-wallet-connected"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {user?.farcasterAvatar ? (
                  <img 
                    src={user.farcasterAvatar} 
                    alt="Farcaster Avatar" 
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      // Fall back to user icon if image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'block';
                    }}
                  />
                ) : ensAvatar ? (
                  <img 
                    src={ensAvatar} 
                    alt="ENS Avatar" 
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      // Fall back to user icon if image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'block';
                    }}
                  />
                ) : null}
                <User className={`w-4 h-4 ${user?.farcasterAvatar || ensAvatar ? 'hidden' : ''}`} />
                <span className="font-medium">{getDisplayName()}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          
          <PopoverContent 
            className="w-80 p-0 mr-4" 
            side="bottom" 
            align="end"
            data-testid="popover-wallet-details"
          >
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center space-x-3">
                {user?.farcasterAvatar ? (
                  <img 
                    src={user.farcasterAvatar} 
                    alt="Farcaster Avatar" 
                    className="w-8 h-8 rounded-full object-cover border-2 border-green-500/20"
                    onError={(e) => {
                      // Fall back to standard check icon if image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                    }}
                  />
                ) : ensAvatar ? (
                  <img 
                    src={ensAvatar} 
                    alt="ENS Avatar" 
                    className="w-8 h-8 rounded-full object-cover border-2 border-green-500/20"
                    onError={(e) => {
                      // Fall back to standard check icon if image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center ${user?.farcasterAvatar || ensAvatar ? 'hidden' : ''}`}>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t('wallet.connected')}</p>
                  <p className="text-sm text-muted-foreground">{t('wallet.farcasterConnectedDesc')}</p>
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                {ensName && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('wallet.ensName')}</p>
                    <p className="font-medium text-orange-500" data-testid="text-ens-name">{ensName}</p>
                  </div>
                )}
                
                {user?.farcasterDisplayName && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('wallet.displayName')}</p>
                    <p className="font-medium" data-testid="text-display-name">{user.farcasterDisplayName}</p>
                  </div>
                )}
                
                {user?.farcasterUsername && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('wallet.username')}</p>
                    <p className="font-medium text-primary" data-testid="text-username">@{user.farcasterUsername}</p>
                  </div>
                )}

                {user?.farcasterFid && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('wallet.farcasterID')}</p>
                    <p className="font-mono text-sm" data-testid="text-farcaster-id">{user.farcasterFid}</p>
                  </div>
                )}

                {/* Balance Display */}
                {(usdcBalance || ethBalance || solBalance) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Bakiyeler</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {usdcBalance && usdcBalance !== '0.00' && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-medium flex items-center space-x-1">
                          <span className="text-green-600">$</span>
                          <span>${usdcBalance} USDC</span>
                        </span>
                      )}
                      {ethBalance && ethBalance !== '0.0000' && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium flex items-center space-x-1">
                          <span className="text-blue-600">Ξ</span>
                          <span>{ethBalance} ETH</span>
                        </span>
                      )}
                      {solBalance && solBalance !== '0.0000' && (
                        <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm font-medium flex items-center space-x-1">
                          <span className="text-purple-600">◎</span>
                          <span>{solBalance} SOL</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-muted-foreground">{t('wallet.address')}</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono text-sm" data-testid="text-wallet-address">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Loading...'}
                    </p>
                    {address && (
                      <button 
                        onClick={() => window.open(`https://basescan.org/address/${address}`, '_blank')}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        data-testid="button-basescan-link"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Disconnect Button */}
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="w-full"
                data-testid="button-disconnect"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('wallet.disconnect')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Disconnected state - show connect options
  return (
    <div className="md:fixed md:top-4 md:right-24 z-50">
      <Dialog open={isConnectMenuOpen} onOpenChange={setIsConnectMenuOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 backdrop-blur-sm transition-all duration-200 shadow-lg font-medium"
            disabled={connecting}
            data-testid="button-wallet-connect"
          >
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span className="font-medium">
                {connecting ? t('wallet.connecting') : t('wallet.connect')}
              </span>
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md md:max-w-lg mx-auto my-auto border-0 shadow-2xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
          <div className="p-6">
            <DialogHeader className="text-center space-y-3 mb-6">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('wallet.connectYourWallet')}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                {t('wallet.chooseWalletToConnect')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleFarcasterConnect}
                disabled={connecting}
                className="w-full h-auto p-4 border-2 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-200 rounded-2xl"
                data-testid="button-connect-farcaster"
              >
                <div className="flex items-center space-x-4 w-full">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{t('wallet.farcaster')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('wallet.connectWallet')}</p>
                  </div>
                </div>
              </Button>

            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
              {t('wallet.termsOfService')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}