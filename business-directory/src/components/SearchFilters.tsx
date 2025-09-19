import { useState, useEffect } from 'react';
import { Search, MapPin, Filter, X, Star, Clock, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQueryParams, useAsync } from '@/lib/hooks';
import { getCategories } from '@/lib/api';

interface SearchFiltersProps {
  onFiltersChange: (filters: any) => void;
  onViewToggle: (view: 'list' | 'map') => void;
  currentView: 'list' | 'map';
  className?: string;
}

export function SearchFilters({ onFiltersChange, onViewToggle, currentView, className }: SearchFiltersProps) {
  const { getParam, setParams } = useQueryParams();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(getParam('q') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState(getParam('location') || '');
  const [openNow, setOpenNow] = useState(getParam('openNow') === 'true');
  const [minRating, setMinRating] = useState(parseInt(getParam('minRating') || '0'));
  const [distanceKm, setDistanceKm] = useState(parseInt(getParam('distanceKm') || '10'));
  const [sortBy, setSortBy] = useState(getParam('sort') || 'best_rated');

  const { data: categories } = useAsync(getCategories, []);

  // Update URL when filters change
  useEffect(() => {
    const filters = {
      q: searchQuery || null,
      categoryIds: selectedCategories.length > 0 ? selectedCategories.join(',') : null,
      location: location || null,
      openNow: openNow ? 'true' : null,
      minRating: minRating > 0 ? minRating.toString() : null,
      distanceKm: distanceKm !== 10 ? distanceKm.toString() : null,
      sort: sortBy !== 'best_rated' ? sortBy : null,
    };

    setParams(filters);
    onFiltersChange(filters);
  }, [searchQuery, selectedCategories, location, openNow, minRating, distanceKm, sortBy]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setLocation('');
    setOpenNow(false);
    setMinRating(0);
    setDistanceKm(10);
    setSortBy('best_rated');
  };

  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || location || openNow || minRating > 0 || distanceKm !== 10;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for businesses, services..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {[searchQuery, selectedCategories.length, location, openNow, minRating > 0, distanceKm !== 10].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onViewToggle(currentView === 'list' ? 'map' : 'list')}
            className="flex items-center gap-2"
          >
            {currentView === 'list' ? <Map className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            {currentView === 'list' ? 'Map View' : 'List View'}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {searchQuery}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
            </Badge>
          )}
          
          {selectedCategories.map(categoryId => {
            const category = categories?.find(c => c.id === categoryId);
            return (
              <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                {category?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleCategoryToggle(categoryId)} />
              </Badge>
            );
          })}
          
          {location && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Location: {location}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setLocation('')} />
            </Badge>
          )}
          
          {openNow && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Open Now
              <X className="h-3 w-3 cursor-pointer" onClick={() => setOpenNow(false)} />
            </Badge>
          )}
          
          {minRating > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Min Rating: {minRating}+
              <X className="h-3 w-3 cursor-pointer" onClick={() => setMinRating(0)} />
            </Badge>
          )}
          
          {distanceKm !== 10 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Within {distanceKm}km
              <X className="h-3 w-3 cursor-pointer" onClick={() => setDistanceKm(10)} />
            </Badge>
          )}
          
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
            Clear All
          </Button>
        </div>
      )}

      {/* Filters Panel */}
      {isFiltersOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Categories */}
            <div>
              <label className="text-sm font-medium mb-3 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories?.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategoryToggle(category.id)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-lg">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Enter location..."
                  value={location}
                  onChange={(e: any) => setLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Open Now */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Open Now</span>
              </div>
              <Switch
                checked={openNow}
                onCheckedChange={(checked: any) => setOpenNow(checked)}
              />
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{minRating}+ stars</span>
              </div>
              <Slider
                value={[minRating]}
                onValueChange={(value: any) => setMinRating(value[0])}
                max={5}
                min={0}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Distance */}
            <div>
              <label className="text-sm font-medium mb-2 block">Distance</label>
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                <span className="text-sm">Within {distanceKm}km</span>
              </div>
              <Slider
                value={[distanceKm]}
                onValueChange={(value: any) => setDistanceKm(value[0])}
                max={50}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best_rated">Best Rated</SelectItem>
                  <SelectItem value="most_reviewed">Most Reviewed</SelectItem>
                  <SelectItem value="nearest">Nearest</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}