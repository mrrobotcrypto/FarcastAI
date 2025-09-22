import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Menu,
  Palette,
  ShoppingBag,
  Info,
  Globe,
  Sun,
  Moon,
  Check
} from "lucide-react";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const menuItems = [
    {
      icon: Palette,
      label: t('header.theme'),
      type: 'theme' as const,
    },
    {
      icon: ShoppingBag,
      label: t('header.shop'),
      type: 'shop' as const,
    },
    {
      icon: Info,
      label: t('header.about'),
      type: 'about' as const,
    },
    {
      icon: Globe,
      label: t('header.language'),
      type: 'language' as const,
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-accent/50"
          data-testid="button-hamburger-menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-80 p-0">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">{t('settings')}</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="py-4">
              {menuItems.map((item, index) => (
                <div key={index} className="px-6 py-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  
                  {item.type === 'theme' && (
                    <div className="ml-11 space-y-2">
                      <Button
                        variant={theme === 'light' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleThemeChange('light')}
                        className="w-full justify-start"
                      >
                        <Sun className="w-4 h-4 mr-2" />
                        {t('theme.light')}
                        {theme === 'light' && <Check className="w-4 h-4 ml-auto" />}
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleThemeChange('dark')}
                        className="w-full justify-start"
                      >
                        <Moon className="w-4 h-4 mr-2" />
                        {t('theme.dark')}
                        {theme === 'dark' && <Check className="w-4 h-4 ml-auto" />}
                      </Button>
                    </div>
                  )}
                  
                  {item.type === 'language' && (
                    <div className="ml-11 space-y-2">
                      <Button
                        variant={language === 'en' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleLanguageChange('en')}
                        className="w-full justify-start"
                      >
                        🇺🇸 English
                        {language === 'en' && <Check className="w-4 h-4 ml-auto" />}
                      </Button>
                      <Button
                        variant={language === 'tr' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleLanguageChange('tr')}
                        className="w-full justify-start"
                      >
                        🇹🇷 Türkçe
                        {language === 'tr' && <Check className="w-4 h-4 ml-auto" />}
                      </Button>
                    </div>
                  )}
                  
                  {item.type === 'shop' && (
                    <div className="ml-11">
                      <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
                    </div>
                  )}
                  
                  {item.type === 'about' && (
                    <div className="ml-11">
                      <p className="text-sm text-muted-foreground">
                        {t('aboutDescription')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}