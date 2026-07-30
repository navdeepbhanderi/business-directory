import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Map, Star, Clock, MapPin, Phone, Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchFilters } from '@/components/SearchFilters';
import { searchBusinesses, getCategories } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { Business } from '@/lib/api';

export default function Search() {
  const [searchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentFilters, setCurrentFilters] = useState<any>({});

  const { data: categories } = useAsync(getCategories, []);

  useEffect(() => {
    loadBusinesses();
  }, [currentFilters]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await searchBusinesses({
        q: currentFilters.q,
        categoryIds: currentFilters.categoryIds ? currentFilters.categoryIds.split(',') : undefined,
        location: currentFilters.location,
        openNow: currentFilters.openNow === 'true',
        minRating: currentFilters.minRating ? parseInt(currentFilters.minRating) : undefined,
        distanceKm: currentFilters.distanceKm ? parseInt(currentFilters.distanceKm) : undefined,
        sort: currentFilters.sort,
        page: 1,
        pageSize: 20
      });

      setBusinesses(result.items);
    } catch (err) {
      setError('Failed to load search results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (filters: any) => {
    setCurrentFilters(filters);
  };

  const BusinessCard = ({ business }: { business: Business }) => (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <CardContent className="p-0">
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-t-lg overflow-hidden">
            {business.media.photos[0] ? (
              <img 
                src={business.media.photos[0]} 
                alt={business.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl text-muted-foreground">{business.name.charAt(0)}</span>
              </div>
            )}
          </div>
          
          <div className="absolute top-3 right-3 flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
                    <Heart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to favorites</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to list</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {business.verified && (
            <Badge className="absolute top-3 left-3 bg-green-500">
              Verified
            </Badge>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{business.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {business.address.line1}, {business.address.city}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{business.rating}</span>
              <span className="text-sm text-muted-foreground">({business.reviewCount})</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {business.categories.slice(0, 2).map(categoryId => {
              const category = categories?.find(c => c.id === categoryId);
              return (
                <Badge key={categoryId} variant="secondary" className="text-xs">
                  {category?.icon} {category?.name}
                </Badge>
              );
            })}
            {business.categories.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{business.categories.length - 2} more
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>2.5 km</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <Clock className="h-4 w-4" />
              <span>Open now</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              View Details
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="px-3">
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Demo only: Call disabled</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MapView = () => (
    <Card className="h-96">
      <CardContent className="p-0 h-full">
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Map className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Interactive map view</p>
            <p className="text-sm text-muted-foreground">Demo only - Map integration disabled</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const LoadingSkeleton = () => (
    <Card>
      <CardContent className="p-0">
        <Skeleton className="h-48 w-full rounded-t-lg" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Results for "{searchParams.get('q') || 'all businesses'}"
          </h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : `${businesses.length} businesses found`}
          </p>
        </div>

        <SearchFilters
          onFiltersChange={handleFiltersChange}
          onViewToggle={setViewMode}
          currentView={viewMode}
          className="mb-8"
        />

        {viewMode === 'map' ? (
          <MapView />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <LoadingSkeleton key={i} />)
            ) : error ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadBusinesses}>Try Again</Button>
              </div>
            ) : businesses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">No businesses found matching your criteria.</p>
                <Button variant="outline" onClick={() => setCurrentFilters({})}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              businesses.map(business => (
                <BusinessCard key={business.id} business={business} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}