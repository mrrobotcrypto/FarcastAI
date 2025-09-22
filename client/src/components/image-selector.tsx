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

// image-selector.tsx (import'ların ALTINA ekle)
function toImageUrls(data: any): string[] {
  if (Array.isArray(data?.images) && data.images.length) {
    return data.images.map((x: any) => x.url).filter(Boolean);
  }
  return (data?.photos ?? [])
    .map((p: any) => p?.src?.medium || p?.src?.landscape || p?.src?.original)
    .filter(Boolean);
}


// --- helpers ---
function toPexelsPhotos(data: any): PexelsPhoto[] {
  // Tercihen ham Pexels şemasını kullan (id, src vb. tam geliyor)
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
  // Normalize ettiğimiz images[] varsa oradan doldur (id'yi üret)
  if (Array.isArray(data?.images) && data.images.length) {
    return data.images.map((x: any, i: number) => ({
      id: -1000 - i, // sentetik id, çakışmaz
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

  // --- FEATURED: önerilen 6 görsel (sayfa ilk açıldığında gelsin) ---
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
      return toPexelsPhotos(data); // <- PexelsPhoto[]
    },
    staleTime: 60_000,
  });

  // --- SEARCH: arama terimi verilince çalışır ---
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
      return toPexelsPhotos(data); // <- PexelsPhoto[]
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

      toast({
        title: t("image.imageUploaded"),
        description: `${file.name} has been uploaded successfully`,
      });
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveUploadedImage = (imageId: string) => {
    setUploadedImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) URL.revokeObjectURL(image.src.medium);
      return prev.filter((img) => img.id !== imageId);
    });

    if (
      selectedImage &&
      "isUploaded" in selectedImage &&
      (selectedImage as UploadedImage).id === imageId
    ) {
      onImageSelect(null as any);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  // Arama varsa searchResults, yoksa featuredResults göster
  const pexelsImages: PexelsPhoto[] =
    (searchResults as PexelsPhoto[] | undefined) ??
    (featuredResults as PexelsPhoto[] | undefined) ??
    [];

  const isLoading = loadingFeatured || loadingSearch;

  // Hata mesajlarını göster (opsiyonel)
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
            <TabsTrigger value="pexels" className="flex items-center gap-2" data-testid="tab-pexels">
              <Search className="w-4 h-4" />
              {t("image.stockPhotos")}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
              <Upload className="w-4 h-4" />
              {t("image.uploadImage")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pexels" className="space-y-4">
            {/* Search Interface */}
            <div>
              <Label htmlFor="image-search" className="text-sm font-medium text-foreground mb-2 block">
                {t("image.searchStockPhotos")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="image-search"
                  type="text"
                  placeholder={t("image.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                  data-testid="input-image-search"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !searchQuery.trim()}
                  data-testid="button-search-images"
                >
                  {loadingSearch ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Pexels Image Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-full aspect-video bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : pexelsImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {pexelsImages.map((image: PexelsPhoto) => (
                  <div
                    key={image.id}
                    className={`relative group cursor-pointer transition-all duration-200 ${
                      selectedImage?.id === image.id
                        ? "ring-2 ring-primary"
                        : "hover:ring-2 hover:ring-primary/50"
                    }`}
                    onClick={() => handleImageSelect(image)}
                    data-testid={`image-option-${image.id}`}
                  >
                    <img
                      src={image.src.medium}
                      alt={image.alt}
                      className="w-full max-h-32 object-contain rounded-lg"
                      loading="lazy"
                    />
                    {selectedImage?.id === image.id && (
                      <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No images found for your search" : "Search for images to get started"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            {/* File Upload Interface */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                {t("image.uploadYourImages")}
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />

              <div
                onClick={triggerFileUpload}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                data-testid="drop-zone-upload"
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {t("image.clickToUpload")}
                </p>
                <p className="text-xs text-muted-foreground">Supports JPG, PNG, GIF up to 10MB</p>
              </div>
            </div>

            {/* Uploaded Images Grid */}
            {uploadedImages.length > 0 ? (
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Your Uploaded Images ({uploadedImages.length})
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {uploadedImages.map((image: UploadedImage) => (
                    <div
                      key={image.id}
                      className={`relative group cursor-pointer transition-all duration-200 ${
                        selectedImage?.id === image.id
                          ? "ring-2 ring-primary"
                          : "hover:ring-2 hover:ring-primary/50"
                      }`}
                      data-testid={`uploaded-image-${image.id}`}
                    >
                      <img
                        src={image.src.medium}
                        alt={image.alt}
                        className="w-full max-h-32 object-contain rounded-lg"
                        onClick={() => handleImageSelect(image)}
                      />

                      {selectedImage?.id === image.id && (
                        <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUploadedImage(image.id);
                        }}
                        data-testid={`button-remove-${image.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>

                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
                        <FileImage className="w-3 h-3 inline mr-1" />
                        {image.file?.name && image.file.name.length > 15
                          ? `${image.file.name.slice(0, 15)}...`
                          : image.file?.name || image.alt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">{t("image.noUploadedImages")}</p>
                <p className="text-xs text-muted-foreground mt-1">Upload images to get started</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
