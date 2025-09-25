import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language-provider";

const BASE = {
  chainId: "0x2105", // 8453
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org/"],
};

const utf8ToHex = (s: string) =>
  "0x" + Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2, "0")).join("");

// .env üzerinden alıcıyı değiştirmek istersen:
// VITE_GM_RECIPIENT=0xabc... (boşsa kendi adresine atar)
const GM_RECIPIENT = (import.meta as any).env?.VITE_GM_RECIPIENT as string | undefined;

export default function OnchainGmButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, lang } = useLanguage() as any;

  const label = lang === "en" ? "Daily GM" : "Günlük GM";

  async function ensureBase(eth: any) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE.chainId }] });
    } catch (e: any) {
      // Chain yoksa ekle
      if (e?.code === 4902) {
        await eth.request({ method: "wallet_addEthereumChain", params: [BASE] });
      } else {
        throw e;
      }
    }
  }

  async function handleClick() {
    try {
      setLoading(true);

      const eth = (window as any).ethereum;
      if (!eth) throw new Error("Web3 wallet not found");

      // Hesap al
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = (accounts && accounts[0])?.toLowerCase();
      if (!from) throw new Error("No wallet account");

      // Base'e geç / ekle
      await ensureBase(eth);

      // 0 ETH'lik, data alanında 'GM' olan tx
      const to = (GM_RECIPIENT || from) as `0x${string}`;
      const data = utf8ToHex(`GM from FarcastAI ${new Date().toISOString()}`);

      const tx = {
        from,
        to,
        value: "0x0",
        data,
      };

      const hash: string = await eth.request({ method: "eth_sendTransaction", params: [tx] });

      toast({
        title: label,
        description:
          lang === "en"
            ? "Sent on-chain GM on Base."
            : "Base ağında on-chain GM gönderildi.",
      });

      // İsteğe bağlı: explorer linkini yeni pencerede aç
      const url = `https://basescan.org/tx/${hash}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        title: lang === "en" ? "Transaction failed" : "İşlem başarısız",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {loading ? (lang === "en" ? "Sending..." : "Gönderiliyor...") : label}
    </Button>
  );
}
