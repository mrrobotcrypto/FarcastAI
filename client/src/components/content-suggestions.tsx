import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { 
  Quote,
  Coins,
  Users,
  TrendingUp,
  Newspaper,
  Zap,
  Image,
  Gamepad2
} from "lucide-react";

interface ContentSuggestionsProps {
  onSuggestionClick: (topic: string) => void;
}

export function ContentSuggestions({ onSuggestionClick }: ContentSuggestionsProps) {
  const { t, language } = useLanguage();

  const suggestions = [
    {
      key: 'dailyQuote',
      icon: Quote,
      color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      topics: {
        en: "Share an inspiring daily quote about innovation, perseverance, or success",
        tr: "İnovasyon, azim veya başarı hakkında ilham verici bir günlük söz paylaş"
      }
    },
    {
      key: 'baseToken',
      icon: Coins,
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      topics: {
        en: "Discuss the latest developments and innovations in Base blockchain ecosystem",
        tr: "Base blockchain ekosistemindeki son gelişmeler ve yenilikler hakkında konuş"
      }
    },
    {
      key: 'farcasterInfo',
      icon: Users,
      color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      topics: {
        en: "Explain what Farcaster is and why it's the future of decentralized social networks",
        tr: "Farcaster'ın ne olduğunu ve neden merkezi olmayan sosyal ağların geleceği olduğunu açıkla"
      }
    },
    {
      key: 'defiTrends',
      icon: TrendingUp,
      color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      topics: {
        en: "Analyze current DeFi trends and their impact on traditional finance",
        tr: "Mevcut DeFi trendlerini ve bunların geleneksel finans üzerindeki etkisini analiz et"
      }
    },
    {
      key: 'cryptoNews',
      icon: Newspaper,
      color: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      topics: {
        en: "Share breaking news and insights from the cryptocurrency world",
        tr: "Kripto para dünyasından son dakika haberleri ve içgörüleri paylaş"
      }
    },
    {
      key: 'aiTech',
      icon: Zap,
      color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      topics: {
        en: "Discuss the latest AI technology breakthroughs and their real-world applications",
        tr: "En son AI teknoloji atılımlarını ve gerçek dünya uygulamalarını tartış"
      }
    },
    {
      key: 'nftTrends',
      icon: Image,
      color: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      topics: {
        en: "Discuss latest NFT marketplace trends, digital art collections, and creator opportunities",
        tr: "Son NFT pazar trendleri, dijital sanat koleksiyonları ve yaratıcı fırsatları tartış"
      }
    },
    {
      key: 'web3Gaming',
      icon: Gamepad2,
      color: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
      topics: {
        en: "Explore play-to-earn gaming, blockchain gaming innovations, and gaming token economics",
        tr: "Play-to-earn oyunları, blockchain oyun yeniliklerini ve oyun token ekonomilerini keşfet"
      }
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Zap className="w-5 h-5 mr-2 text-primary" />
          {t('content.suggestions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.key}
              variant="outline"
              onClick={() => onSuggestionClick(suggestion.topics[language as keyof typeof suggestion.topics])}
              className="h-auto p-2 flex items-center justify-start space-x-2 hover:bg-accent/50 border-2 hover:border-primary/20 transition-all duration-200 whitespace-normal text-left"
              data-testid={`suggestion-${suggestion.key}`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${suggestion.color}`}>
                <suggestion.icon className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-medium leading-tight text-left flex-1 break-words">
                {t(`content.suggestions.${suggestion.key}`)}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}