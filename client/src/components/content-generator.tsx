import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/hooks/use-wallet";
import { useLanguage } from "@/components/language-provider";
import { ContentSuggestions } from "@/components/content-suggestions";
import { Zap, Loader2, Edit3, AlertCircle, CheckCircle } from "lucide-react";

interface ContentGeneratorProps {
  onContentGenerated: (content: string, source: "ai" | "manual") => void;
}

// /api/generate JSON'undan güvenli metin seçici
const pickText = (d: any) =>
  (d?.text || d?.content || d?.result || d?.message || "").toString();

export function ContentGenerator({ onContentGenerated }: ContentGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [activeTab, setActiveTab] = useState("ai");
  const [lastError, setLastError] = useState<string | null>(null);
  const { user } = useWallet();
  const { toast } = useToast();

  // Dil ve çeviri sağlayıcı
  const { t, lang } = useLanguage();
  const activeLang = lang || "tr"; // 'tr' | 'en'

  const queryClient = useQueryClient();

  // Dil değişince formları temizle
  useEffect(() => {
    const handleLanguageChange = () => {
      setTopic("");
      setManualContent("");
      onContentGenerated("", "manual"); // içerik alanını da temizle
    };
    window.addEventListener("languageChanged", handleLanguageChange);
    return () =>
      window.removeEventListener("languageChanged", handleLanguageChange);
  }, [onContentGenerated]);

  // AI içerik üretimi: SADECE topic + lang => GET /api/generate
  const generateContentMutation = useMutation({
    mutationFn: async ({ topic }: { topic: string }) => {
      const url = `/api/generate?prompt=${encodeURIComponent(
        topic
      )}&lang=${encodeURIComponent(activeLang)}`;
      const r = await fetch(url, { method: "GET" });
      let data: any = {};
      try {
        data = await r.json();
      } catch {}
      if (!r.ok) {
        const msg = data?.message || `İstek başarısız (${r.status})`;
        throw new Error(msg);
      }
      return pickText(data);
    },
    onSuccess: (text) => {
      onContentGenerated(text, "ai");
      setLastError(null);
      toast({
        title: t("toast.contentGenerated"),
        description: t("toast.contentReady"),
      });
    },
    onError: (error: any) => {
      let errorMessage = error.message || t("toast.failedToGenerate");
      let errorDescription = t("toast.tryAgainLater");

      if (
        error.message?.toLowerCase().includes("quota") ||
        error.message?.toLowerCase().includes("billing")
      ) {
        errorMessage = t("toast.quotaExceeded");
        errorDescription = t("toast.quotaExceededDesc");
      } else if (
        error.message?.toLowerCase().includes("api_key") ||
        error.message?.toLowerCase().includes("unauthorized")
      ) {
        errorMessage = t("toast.configIssue");
        errorDescription = t("toast.configIssueDesc");
      } else if (error.message?.toLowerCase().includes("rate_limit")) {
        errorMessage = t("toast.tooManyRequests");
        errorDescription = t("toast.tooManyRequestsDesc");
      }

      setLastError(errorMessage);
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      const response = await apiRequest("POST", "/api/drafts", draftData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: t("toast.draftSaved"),
        description: t("toast.draftSavedDesc"),
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/drafts/user", user?.id],
      });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.saveFailed"),
        description: error.message || t("toast.saveFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast({
        title: t("toast.topicRequired"),
        description: t("toast.topicRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    generateContentMutation.mutate({ topic: topic.trim() });
  };

  const handleManualSubmit = () => {
    if (!manualContent.trim()) {
      toast({
        title: "Content required",
        description: "Please enter your content",
        variant: "destructive",
      });
      return;
    }

    if (manualContent.trim().length < 10) {
      toast({
        title: "Content too short",
        description: "Please enter at least 10 characters",
        variant: "destructive",
      });
      return;
    }

    onContentGenerated(manualContent.trim(), "manual");
    toast({
      title: t("toast.manualContentReady"),
      description: t("toast.manualContentReadyDesc"),
    });
  };

  const handleSaveDraft = () => {
    if (!user) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to save drafts",
        variant: "destructive",
      });
      return;
    }

    let draftContent = null;
    let draftTopic = "";

    if (activeTab === "ai") {
      if (!topic.trim()) {
        toast({
          title: "Missing information",
          description: "Please fill in topic before saving",
          variant: "destructive",
        });
        return;
      }
      draftTopic = topic.trim();
    } else {
      if (!manualContent.trim()) {
        toast({
          title: "Missing content",
          description: "Please enter your content before saving",
          variant: "destructive",
        });
        return;
      }
      draftTopic = manualContent.trim().slice(0, 50) + "...";
      draftContent = manualContent.trim();
    }

    const draftData = {
      userId: user.id,
      topic: draftTopic,
      contentType: activeTab === "ai" ? "auto" : "manual",
      tone: activeTab === "ai" ? "neutral" : "custom",
      generatedContent: draftContent,
      selectedImage: null,
      isPublished: false,
    };

    saveDraftMutation.mutate(draftData);
  };

  return (
    <Card className="content-card border border-border h-full flex flex-col">
      <CardContent className="p-6 flex-1">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-accent" />
          {t("content.generator")}
        </h2>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger
              value="ai"
              className="flex items-center gap-2"
              data-testid="tab-ai-mode"
            >
              <Zap className="w-4 h-4" />
              {t("content.aiGeneration")}
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex items-center gap-2"
              data-testid="tab-manual-mode"
            >
              <Edit3 className="w-4 h-4" />
              {t("content.manualInput")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            {lastError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">
                    {lastError}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try using the Manual Input mode as an alternative
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label
                htmlFor="topic"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                {t("content.topic")}
              </Label>
              <Input
                id="topic"
                type="text"
                placeholder={t("content.topic.placeholder")}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full"
                data-testid="input-topic"
              />
            </div>

            <ContentSuggestions
              onSuggestionClick={(suggestedTopic) => setTopic(suggestedTopic)}
            />

            <Button
              onClick={handleGenerate}
              disabled={generateContentMutation.isPending || !topic.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border-0"
              data-testid="button-generate-content"
            >
              {generateContentMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t("content.generate")}</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>{t("content.generate")}</span>
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div>
              <Label
                htmlFor="manual-content"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                {t("content.yourContent")}
              </Label>
              <Textarea
                id="manual-content"
                placeholder={t("content.manualInput.placeholder")}
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                className="w-full min-h-[200px] resize-y"
                data-testid="textarea-manual-content"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  {manualContent.length} {t("content.characters")}
                </span>
                {manualContent.length >= 10 && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    {t("content.readyToUse")}
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleManualSubmit}
              disabled={
                !manualContent.trim() || manualContent.trim().length < 10
              }
              className="w-full bg-primary text-primary-foreground font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              data-testid="button-submit-manual-content"
            >
              <Edit3 className="w-5 h-5" />
              <span>{t("content.useThisContent")}</span>
            </Button>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSaveDraft}
          disabled={saveDraftMutation.isPending || !user}
          variant="secondary"
          className="w-full mt-4"
          data-testid="button-save-draft"
        >
          {saveDraftMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("button.saving")}
            </>
          ) : (
            t("button.saveAsDraft")
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
