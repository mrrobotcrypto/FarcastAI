import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { Wallet, Check, User } from "lucide-react";

export function WalletConnection() {
  const { isConnected, address, user, connecting, connect, disconnect } = useWallet();

  return (
    <Card className="content-card border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Wallet Connection</h2>
            <p className="text-sm text-muted-foreground">Connect your wallet to start creating content</p>
          </div>
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {isConnected && address ? (
          <>
            {/* Connected State */}
            <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground" data-testid="wallet-address">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                  <p className="text-sm text-muted-foreground">Connected via Wallet</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={disconnect}
                data-testid="button-disconnect-wallet"
              >
                Disconnect
              </Button>
            </div>

            {/* Farcaster Profile Info */}
            {user && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground" data-testid="user-display-name">
                      {user.farcasterDisplayName || user.farcasterUsername || "Not set"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      FID: <span data-testid="user-fid">{user.farcasterFid || "Not connected"}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Disconnected State */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No wallet connected</p>
            <Button 
              onClick={connect} 
              disabled={connecting}
              className="wallet-gradient hover:opacity-90 transition-opacity"
              data-testid="button-connect-wallet"
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
