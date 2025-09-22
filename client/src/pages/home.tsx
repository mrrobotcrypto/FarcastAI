import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CornerWalletWidget } from "@/components/corner-wallet-widget";
// import { ContentGenerator } from "@/components/content-generator"; // KALDIRILDI
import { ImageSelector } from "@/components/image-selector";
import { ContentPreview } from "@/components/content-preview";
import { useWallet } from "@/hooks/use-wallet";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, ExternalLink, Users } from "lucide-react"; // sadeleştirildi
import { SiX } from "react-icons/si";
import type { ContentDraft } from "@shared/schema";

interface PexelsPhoto {
  id: number;
  src: {
    medium: string;
    large: string;
  };
  alt: string;
  photographer: string;
}

interface UploadedImage {
  id: string;
  src: {
    medium: string;
    large: string;
  };
  alt: string;
  photographer: string;
  isUploaded: true;
  file: File;
}

type ImageType = PexelsPhoto | UploadedImage;

// /api/generate JSON'undan metni güvenli çeken ufak yardımcı
function pickText(d: any): string {
  return (d?.text || d?.content || d?.result || d?.message || "").toString();
}

const PRESETS = [
  { id: "sum3", label: "3 madde özetle", example: "Base ekosistemini 3 maddeyle özetle" },
  { id: "tweet", label: "Tweet yaz", example: "Base ekosistemi hakkında etkili bir tweet yaz" },
  { id: "explain", label: "Basitçe anlat", example: "ZK-Rollup'ı 2 paragrafta, basitçe açıkla" },
];

export default function Home() {
  const [generatedContent, setGeneratedContent] = useState("");
  const [contentSource, setContentSource] = useState<"ai" | "manual" | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);

  // Yeni: sade prompt alanı
  const [prompt, setPrompt] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Reset all form fields after successful cast
  const resetAllFields = () => {
    setGeneratedContent("");
    setContentSource(null);
    setSelectedImage(null);
    setPrompt("");
    setGenError(null);
  };

  const { user } = useWallet();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  // Fetch user's recent drafts
  const { data: recentDrafts } = useQuery({
    queryKey: ["/api/drafts/user", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/drafts/user/${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch drafts");
      return response.json();
    },
    enabled: !!user,
  });

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Sade generate: /api/generate?prompt=... (GET)
  async function generateNow(input: string) {
    setGenError(null);
    setGenLoading(true);
    try {
      const r = await fetch(`/api/generate?prompt=${encodeURIComponent(input)}`, { method: "GET" });
      let body: any = {};
      try { body = await r.json(); } catch {}
      if (!r.ok) {
        const msg = body?.message || `İstek başarısız (${r.status})`;
        throw new Error(msg);
      }
      const text = pickText(body);
      setGeneratedContent(text || "(boş yanıt)");
      setContentSource("ai");
    } catch (e: any) {
      setGenError(e?.message || "Bir hata oluştu");
    } finally {
      setGenLoading(false);
    }
  }

  const onSubmit = () => {
    const p = prompt.trim();
    if (!p) return;
    generateNow(p);
  };

  const usePreset = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Corner Wallet Widget + Hamburger Menu - Desktop only */}
      <div className="hidden md:block">
        <CornerWalletWidget />
        {/* Hamburger Menu positioned to the right of wallet widget */}
        <div className="fixed top-4 right-4 z-50">
          <HamburgerMenu />
        </div>
      </div>
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="FarcastAI Logo" 
                className="w-10 h-10 rounded-lg shadow-md"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">{t('app.title')}</h1>
                <p className="text-xs text-muted-foreground">{t('app.subtitle')}</p>
              </div>
            </div>

            {/* Desktop: Empty space - controls moved to hamburger menu */}
            <div className="hidden md:block">
              {/* Desktop controls moved to hamburger menu positioned next to wallet */}
            </div>

            {/* Mobile: Hamburger menu + Wallet */}
            <div className="flex md:hidden items-center space-x-2">
              <HamburgerMenu />
              <div className="scale-90">
                <CornerWalletWidget />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Content Creation */}
        <div className="space-y-8">
          {/* Top Row - Creation Tools */}
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* SOLDAN: Sade Prompt + Generate + Presets */}
            <Card className="h-full">
              <CardContent className="p-4 md:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Metin Üretici</h2>

                {/* Hızlı seçenekler */}
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(p => (
                    <Button key={p.id} variant="secondary" size="sm" onClick={() => usePreset(p.example)}>
                      {p.label}
                    </Button>
                  ))}
                </div>

                {/* Prompt girişi */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Bir cümle yaz (örn. Base ekosistemini 3 maddeyle özetle)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                  />
                  <Button onClick={onSubmit} disabled={genLoading || !prompt.trim()}>
                    {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Üret"}
                  </Button>
                </div>

                {/* Hata */}
                {genError && (
                  <div className="text-sm text-destructive">
                    {genError}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SAĞDAN: Görsel seçici */}
            <div className="h-full">
              <ImageSelector 
                selectedImage={selectedImage} 
                onImageSelect={setSelectedImage} 
              />
            </div>
          </div>

          {/* Bottom Row - Preview */}
          <div className="w-full">
            <ContentPreview
              content={generatedContent}
              selectedImage={selectedImage}
              contentSource={contentSource}
              onContentChange={setGeneratedContent}
              onResetFields={resetAllFields}
            />
          </div>
        </div>

        {/* Recent Activity */}
        {recentDrafts && (recentDrafts as ContentDraft[]).length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-accent" />
              Recent Activity
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(recentDrafts as ContentDraft[]).slice(0, 6).map((draft: ContentDraft) => (
                <Card
                  key={draft.id}
                  className="content-card border border-border hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  data-testid={`draft-card-${draft.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(draft.createdAt || new Date()).toLocaleDateString()}
                      </span>
                      {draft.isPublished && (
                        <div className="flex items-center space-x-1 text-accent">
                          <ExternalLink className="w-3 h-3" />
                          <span className="text-xs">Published</span>
                        </div>
                      )}
                    </div>

                    {draft.selectedImage && typeof draft.selectedImage === 'object' && 'url' in draft.selectedImage && (
                      <img
                        src={(draft.selectedImage as any).url}
                        alt={(draft.selectedImage as any).alt || ''}
                        className="w-full max-h-32 object-contain rounded-lg mb-3"
                      />
                    )}

                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {draft.topic}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {draft.generatedContent?.slice(0, 100) || "Draft saved"}
                        {draft.generatedContent && draft.generatedContent.length > 100 && "..."}
                      </p>
                    </div>

                    {/* BURADA ESKİDEN contentType / tone gösteriliyordu → KALDIRILDI */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground capitalize">
                        {/* Örn. basit bilgi göstermek istersen: */}
                        {draft.isPublished ? "published" : "draft"}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-view-draft-${draft.id}`}
                      >
                        View →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-lg mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 wallet-gradient rounded"></div>
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} By MrRobotCrypto
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Privacy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Terms
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Support
              </a>
              <a 
                href="https://x.com/MrRobotKripto" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground transition-colors ml-2" 
                data-testid="link-twitter"
                aria-label="Follow on X (Twitter)"
              >
                <SiX size={16} />
              </a>
              <a 
                href="https://farcaster.xyz/mrrobotcrypto.eth" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground transition-colors ml-2" 
                data-testid="link-farcaster"
                aria-label="Follow on Farcaster"
              >
                <Users size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
