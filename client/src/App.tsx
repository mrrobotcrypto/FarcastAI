import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/hooks/use-wallet";
import { LanguageProvider } from "@/components/language-provider";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { OnchainGmButton } from "@/components/onchain-gm-button";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Farcaster SDK
  useEffect(() => {
    const initializeFarcasterSDK = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          // Signal that the app is ready - this will hide the splash screen
          await sdk.actions.ready();
          console.log('Farcaster SDK initialized successfully');
        }
      } catch (error) {
        console.warn('Failed to initialize Farcaster SDK:', error);
      }
    };
    
    initializeFarcasterSDK();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider defaultTheme="dark" storageKey="farcastai-theme">
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </WalletProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
// test redeploy trigger
