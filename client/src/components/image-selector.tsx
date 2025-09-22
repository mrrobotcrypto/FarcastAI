import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language-provider";
import { Image as ImageIcon, Search, Loader2, Upload, X, FileImage } from "lucide-react";

// --- helpers ---
function toPexelsPhotos(data: any): PexelsPhoto[] {
  if (Array.isArray(data?.photos) && data.photos.length) {
    return data.photos.map((p: any) => ({
      id: p.id,
      src: {
        medium: p?.src?.medium || p?.src?.landscape || p?.src?.original,
        large: p?.src?.large || p?.src?.original,
      },
      alt: p?.alt || "",
      photographer: p?.photographer || "",
    }));
  }
  if (Array.isArray(data?.images) && data.images.length) {
    return data.images.map((x: any, i: number) => ({
      id: -1000 - i,
      src: {
        medium: x?.url,
        large: x?.url,
      },
      alt: x?.alt || "",
      photographer: x?.photographer || "",
    }));
  }
  return [];
}

interface PexelsPhoto {
  id: number;
  src: { medium: string; large: string };
  alt: string;
  photographer: string;
}

interface UploadedImage {
  id: string;
  src: { medium: string; large: string };
  alt: string;
  photographer: string;
  isUploaded: true;
  file: File;
}

type ImageType = PexelsPhoto | UploadedImage;

interface ImageSelectorProps {
  selectedImage: ImageType | null;
  onImageSelect: (image: ImageType) => void;
}

export function ImageSelector({ selectedImage, onImageSelect }: ImageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [activeTab, setActiveTab] = useState("pexels");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // FEATURED görseller (her 1 saatte bir yenilensin)
  const {
    data: featuredResults,
    isLoading: loadingFeatured,
    error: featuredError,
  } = useQuery({
    queryKey: ["/api/images/featured", 6],
    queryFn: async () => {
      const response = await fetch("/api/images/featured?per_page=6", { method: "GET" });
      if (!response.ok) throw new Error("featured failed");
      const data = await response.json();
      return toPexelsPhotos(data);
    },
    staleTime: 60_000,
    refetchInterval: 3600000, // 1 saat
  });

  // SEARCH görselleri
  const {
    data: searchResults,
    isLoading: loadingSearch,
    error: searchError,
  } = useQuery({
    queryKey: ["/api/images/search", searchTerm],
    queryFn: async () => {
      const response = await fetch(
        `/api/images/search?q=${encodeURIComponent(searchTerm)}&per_page=6`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("search failed");
      const data = await response.json();
      return toPexelsPhotos(data);
    },
    enabled: !!searchTerm,
    staleTime: 60_000,
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: t("image.searchRequired"),
        description: t("image.enterSearchTerm"),
        variant: "destructive",
      });
      return;
    }
    setSearchTerm(searchQuery.trim());
  };

  const handleImageSelect = (image: ImageType) => {
    onImageSelect(image);
    toast({
      title: t("image.selected"),
      description: (image as any).isUploaded
        ? t("image.uploadedSelected")
        : t("image.stockPhotoSelected"),
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t("image.invalidFileType"),
          description: "Please upload an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("image.fileTooLarge"),
          description: "Please upload an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      const uploadedImage: UploadedImage = {
        id: `upload-${Date.now()}-${Math.random()}`,
        src: { medium: imageUrl, large: imageUrl },
        alt: file.name,
        photographer: "You",
        isUploaded: true,
        file,
      };
      setUploadedImages((prev) => [...prev, uploadedImage]);
      toast({ title: t("image.imageUploaded"), description: `${file.name} uploaded successfully` });
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveUploadedImage = (imageId: string) => {
    setUploadedImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) URL.revokeObjectURL(image.src.medium);
      return prev.filter((img) => img.id !== imageId);
    });
    if (selectedImage && "isUploaded" in selectedImage && (selectedImage as UploadedImage).id === imageId) {
      onImageSelect(null as any);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const pexelsImages: PexelsPhoto[] = searchResults ?? featuredResults ?? [];
  const isLoading = loadingFeatured || loadingSearch;

  if (featuredError || searchError) {
    console.warn("Image fetch error", featuredError || searchError);
  }

  return (
    <Card className="content-card border border-border h-full flex flex-col">
      <CardContent className="p-6 flex-1">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-accent" />
          {t("image.producer")}
        </h3>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pexels" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t("image.stockPhotos")}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t("image.uploadImage")}
            </TabsTrigger>
          </TabsList>

          {/* STOCK PHOTOS */}
          <TabsContent value="pexels" className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t("image.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
                {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-full aspect-video bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pexelsImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {pexelsImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative group cursor-pointer transition ${
                      selectedImage?.id === image.id ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50"
                    }`}
                    onClick={() => handleImageSelect(image)}
                  >
                    <img
                      src={image.src.medium}
                      alt={image.alt}
                      className="w-full aspect-video object-cover rounded-lg"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No images found" : "Search for images to get started"}
              </div>
            )}
          </TabsContent>

          {/* UPLOAD */}
          <TabsContent value="upload" className="space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            <div onClick={triggerFileUpload} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p>{t("image.clickToUpload")}</p>
            </div>
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative group cursor-pointer">
                    <img
                      src={img.src.medium}
                      alt={img.alt}
                      className="w-full aspect-video object-cover rounded-lg"
                      onClick={() => handleImageSelect(img)}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUploadedImage(img.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
