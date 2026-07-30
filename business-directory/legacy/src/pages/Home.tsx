import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/i18n';
import { searchBusinesses, getCategories } from '@/lib/api';
import type { Business, Category } from '@/lib/api';
import { Search, Star, MapPin, Clock } from 'lucide-react';
import { useEffect } from 'react';

export default function Home() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [businessesResult, categoriesData] = await Promise.all([
          searchBusinesses({ pageSize: 6 }),
          getCategories()
        ]);
        setFeaturedBusinesses(businessesResult.items);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/search?category=${categoryId}`);
  };

  const handleBusinessClick = (slug: string) => {
    navigate(`/business/${slug}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('home.hero.title')}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('home.hero.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" size="lg" className="absolute right-2 top-1/2 transform -translate-y-1/2">
                {t('home.hero.searchButton')}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t('home.categories.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleCategoryClick(category.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <h3 className="font-semibold">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {t('home.featured.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('home.featured.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBusinesses.map((business) => (
              <Card
                key={business.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleBusinessClick(business.slug)}
              >
                <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                  {business.media.photos[0] && (
                    <img
                      src={business.media.photos[0]}
                      alt={business.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{business.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {business.address.line1}, {business.address.city}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {business.verified && (
                        <Badge variant="secondary" className="text-xs">
                          {t('business.verified')}
                        </Badge>
                      )}
                      {business.claimed && (
                        <Badge variant="outline" className="text-xs">
                          {t('business.claimed')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 font-semibold">{business.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({business.reviewCount} {t('business.reviews')})
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      Open Now
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate('/search')}>
              View All Businesses
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Notice */}
      <section className="py-8 bg-yellow-50 dark:bg-yellow-900/20 border-y">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('demo.notice')}
          </p>
        </div>
      </section>
    </div>
  );
}