import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Check } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (newLang: 'en' | 'tr') => {
    setLanguage(newLang);
    
    // Clear form data when language changes
    // Dispatch a custom event to notify components to clear their state
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { newLanguage: newLang }
    }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="button-language-switcher"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {language === 'tr' ? 'TR' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className="flex items-center gap-2"
          data-testid="language-option-en"
        >
          {language === 'en' && <Check className="h-4 w-4" />}
          <span className={language === 'en' ? 'ml-0' : 'ml-6'}>
            🇺🇸 English
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('tr')}
          className="flex items-center gap-2"
          data-testid="language-option-tr"
        >
          {language === 'tr' && <Check className="h-4 w-4" />}
          <span className={language === 'tr' ? 'ml-0' : 'ml-6'}>
            🇹🇷 Türkçe
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}