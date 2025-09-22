import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Eye, Send, Edit, User, Loader2, MessageCircle, Repeat, Heart, Share, ExternalLink } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

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

interface ContentPreviewProps {
  content: string;
  selectedImage: ImageType | null;
  contentSource: 'ai' | 'manual' | null;
  onContentChange: (content: string) => void;
  onResetFields?: () => void;
}

export function ContentPreview({ content, selectedImage, contentSource, onContentChange, onResetFields }: ContentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showFidModal, setShowFidModal] = useState(false);
  const [farcasterFid, setFarcasterFid] = useState("");
  const [pendingPublishData, setPendingPublishData] = useState<{ content: string; imageUrl?: string } | null>(null);
  const [castPreparation, setCastPreparation] = useState<{ farcasterUrl: string; castContent: string } | null>(null);
  const { user, displayName, updateUser } = useWallet();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Native Farcaster compose function using Mini Apps SDK
  const openNativeFarcasterCompose = async (content: string, imageUrl?: string) => {
    try {
      // Import and use Farcaster Mini Apps SDK
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      // Prepare embeds array (SDK expects specific array types)
      const embeds: [] | [string] | [string, string] = imageUrl ? [imageUrl] : [];
      
      // Use native Farcaster compose with content and image
      const result = await sdk.actions.composeCast({
        text: content,
        embeds: embeds,
      });
      
      console.log('Farcaster compose result:', result);
      
      toast({
        title: t('content.castOpened'),
        description: t('content.nativeFarcasterOpened'),
      });
      
      // Reset fields after native cast success
      if (onResetFields) {
        setTimeout(() => {
          onResetFields();
        }, 1000); // Small delay to let user see the success message
      }
      
      return true;
    } catch (error) {
      console.warn('Native Farcaster compose not available, falling back to URL:', error);
      return false;
    }
  };

  const publishMutation = useMutation({
    mutationFn: async (data: { content: string; imageUrl?: string }) => {
      const preparedContent = data.content.trim();
      
      // Try native compose first
      const nativeSuccess = await openNativeFarcasterCompose(preparedContent, data.imageUrl);
      
      if (!nativeSuccess) {
        // Create Farcaster compose URL as fallback
        let farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(preparedContent)}`;
        
        // Add image to the compose URL if available
        if (data.imageUrl) {
          farcasterUrl += `&embeds[]=${encodeURIComponent(data.imageUrl)}`;
        }
        
        return {
          castContent: preparedContent,
          farcasterUrl: farcasterUrl,
          success: true,
          useNative: false
        };
      }
      
      return {
        castContent: preparedContent,
        success: true,
        useNative: true
      };
    },
    onSuccess: (data) => {
      if (!data.useNative && data.farcasterUrl) {
        // Open Farcaster URL in new tab as fallback
        window.open(data.farcasterUrl, '_blank');
        
        toast({
          title: t('content.castPrepared'),
          description: t('content.shareManually'),
        });
      }
      
      // Reset all fields after successful cast
      if (onResetFields) {
        setTimeout(() => {
          onResetFields();
        }, 1000); // Small delay to let user see the success message
      }
    },
    onError: (error: any) => {
      // Check if error is due to missing Farcaster FID
      if (error.message && error.message.includes("Farcaster FID not set")) {
        setShowFidModal(true);
        setPendingPublishData({
          content: content.trim(),
          imageUrl: selectedImage?.src.large,
        });
      } else {
        toast({
          title: t('content.publishingFailed'),
          description: error.message || t('content.failedToPublish'),
          variant: "destructive",
        });
      }
    },
  });

  const handleSaveEdit = () => {
    onContentChange(editedContent);
    setIsEditing(false);
    toast({
      title: t('content.contentUpdated'),
      description: t('content.changesSaved'),
    });
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handlePublish = () => {
    if (!content.trim()) {
      toast({
        title: t('content.noContentToPrepare'),
        description: t('content.generateContentFirst'),
        variant: "destructive",
      });
      return;
    }

    // Check wallet requirement only for AI content
    if (contentSource === 'ai' && !user) {
      toast({
        title: t('wallet.aiContentRequiresWallet'),
        description: t('wallet.connectWalletToCastAI'),
        variant: "destructive",
      });
      return;
    }

    publishMutation.mutate({
      content: content.trim(),
      imageUrl: selectedImage?.src.large,
    });
  };

  // Update local edited content when external content changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  return (
    <Card className="content-card border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <Eye className="w-5 h-5 mr-2 text-accent" />
            {t('content.preview')}
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            data-testid="button-edit-content"
          >
            <Edit className="w-4 h-4 mr-1" />
            {isEditing ? t('content.cancel') : t('content.edit')}
          </Button>
        </div>

        {/* Cast Preview */}
        <div className="border border-border rounded-xl p-4 bg-muted/50 mb-6">
          <div className="flex items-start space-x-3 mb-3">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground" data-testid="preview-username">
                  {displayName || t('preview.yourUsername')}
                </span>
                <span className="text-sm text-muted-foreground">{t('preview.now')}</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-3 mb-4">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                  placeholder={t('content.editPlaceholder') || 'Edit your content here...'}
                  data-testid="textarea-edit-content"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleSaveEdit}
                    data-testid="button-save-edit"
                  >
                    {t('content.saveChanges')}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={handleCancelEdit}
                    data-testid="button-cancel-edit"
                  >
                    {t('content.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-foreground leading-relaxed whitespace-pre-wrap" data-testid="preview-content">
                  {content || (
                    <span className="text-muted-foreground italic">
                      {t('content.generatedContentPlaceholder') || 'Generated content will appear here...'}
                    </span>
                  )}
                </div>
                {content && (
                  <p className="text-muted-foreground text-sm flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    Generated by FarcastAI
                  </p>
                )}
              </>
            )}
          </div>

          {/* Selected Image */}
          {selectedImage && (
            <div className="mb-4">
              <img
                src={selectedImage.src.medium}
                alt={selectedImage.alt}
                className="w-full max-h-64 object-contain rounded-lg"
                data-testid="preview-image"
              />
            </div>
          )}

          {/* Engagement Preview */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center space-x-6">
              <button className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Reply</span>
              </button>
              <button className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
                <Repeat className="w-4 h-4" />
                <span className="text-sm">Recast</span>
              </button>
              <button className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
                <Heart className="w-4 h-4" />
                <span className="text-sm">Like</span>
              </button>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending || !content.trim()}
            className="w-full farcaster-purple text-white font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            data-testid="button-publish-to-farcaster"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('content.preparing')}</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{t('content.prepare')}</span>
              </>
            )}
          </Button>

          {/* Cast Preparation Result */}
          {castPreparation && (
            <div 
              className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3"
              data-testid="cast-preparation-result"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Cast hazırlandı! Manuel olarak Farcaster'da paylaşın
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-2">Hazırlanan içerik:</p>
                <p className="text-sm text-foreground">{castPreparation.castContent}</p>
              </div>
              
              <Button
                onClick={() => window.open(castPreparation.farcasterUrl, '_blank')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-open-farcaster"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Farcaster'da Aç ve Paylaş
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCastPreparation(null)}
                className="w-full text-muted-foreground"
                data-testid="button-close-preparation"
              >
                Kapat
              </Button>
            </div>
          )}

          {/* Demo Mode Indicator - Only show when demo mode is enabled */}
          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div 
              className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
              data-testid="status-demo-mode"
            >
              <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                ⚡ Demo Mode: Casts are simulated - Not sent to real Farcaster
              </p>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
