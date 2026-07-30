import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authSlice';
import { useUIStore } from '@/store/uiSlice';
import { useLocale } from '@/i18n';
import { Search, Menu, Sun, Moon, Globe, User, Bell, Heart, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function Header() {
  const { role, user, signOut } = useAuthStore();
  const { theme, setTheme, locale, setLocale } = useUIStore();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BD</span>
            </div>
            <span className="font-bold text-xl">Business Directory</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('home.hero.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </form>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium hover:text-primary">
              {t('nav.home')}
            </Link>
            <Link to="/search" className="text-sm font-medium hover:text-primary">
              {t('nav.search')}
            </Link>
            <Link to="/pricing" className="text-sm font-medium hover:text-primary">
              {t('nav.pricing')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Auth Actions */}
            {role === 'guest' ? (
              <div className="flex items-center space-x-2">
                {/* Theme Toggle for Guests */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-9 w-9"
                >
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>

                {/* Locale Toggle for Guests */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLocale}
                  className="h-9 w-9"
                >
                  <Globe className="h-4 w-4" />
                </Button>

                <Button variant="ghost" asChild>
                  <Link to="/auth/signin">{t('nav.signIn')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth/signup">{t('nav.signUp')}</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {role === 'admin' && (
                  <Button variant="outline" asChild>
                    <Link to="/admin">{t('nav.admin')}</Link>
                  </Button>
                )}
                {role === 'owner' && (
                  <Button variant="outline" asChild>
                    <Link to="/owner/dashboard">{t('nav.dashboard')}</Link>
                  </Button>
                )}
                
                {/* User Account Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:block">{user?.name}</span>
                      {user?.premium && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                          Premium
                        </span>
                      )}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {/* User Info */}
                    <div className="px-2 py-1.5 text-sm">
                      <div className="font-medium">{user?.name}</div>
                      <div className="text-muted-foreground capitalize">{role}</div>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Account Links */}
                    <DropdownMenuItem asChild>
                      <Link to="/account/lists" className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        My Lists & Favorites
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {/* Settings */}
                    <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2">
                      {theme === 'light' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleLocale} className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {locale === 'en' ? 'العربية' : 'English'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {/* Sign Out */}
                    <DropdownMenuItem onClick={signOut} className="text-red-600">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('home.hero.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}