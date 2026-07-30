import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, MapPin, Clock, Phone, Mail, Globe, Heart, Plus, 
  Share2, Camera, Video, Calendar, DollarSign, 
  ThumbsUp, MessageCircle,
  Instagram, Facebook, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getBusiness, getReviews, getCategories } from '@/lib/api';
import type { Business, Review, Category } from '@/lib/api';

export default function BusinessProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewFilter, setReviewFilter] = useState<number | null>(null);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [isReplyDrawerOpen, setIsReplyDrawerOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const [businessData, reviewsData, categoriesData] = await Promise.all([
          getBusiness(slug),
          getReviews(slug),
          getCategories()
        ]);
        
        setBusiness(businessData);
        setReviews(reviewsData.items);
        setCategories(categoriesData);
      } catch (error) {
        setError('Failed to load business data');
        console.error('Failed to load business data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleReviewReply = (review: Review) => {
    setSelectedReview(review);
    setIsReplyDrawerOpen(true);
  };

  const getCurrentHours = () => {
    if (!business) return null;
    
    const now = new Date();
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const hours = business.hours[currentDay];
    if (!hours || hours.length === 0) return { isOpen: false, nextOpen: null };
    
    const isOpen = hours.some(slot => {
      const openTime = parseInt(slot.open.replace(':', ''));
      const closeTime = parseInt(slot.close.replace(':', ''));
      return currentTime >= openTime && currentTime <= closeTime;
    });
    
    return { isOpen, nextOpen: null };
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderReviewBreakdown = () => {
    const totalReviews = reviews.length;
    if (totalReviews === 0) return null;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      breakdown[review.rating as keyof typeof breakdown]++;
    });

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = breakdown[rating as keyof typeof breakdown];
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-8">{rating}</span>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-8">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Business Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || 'The business you are looking for does not exist.'}</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hoursStatus = getCurrentHours();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{business.name}</h1>
                {business.verified && (
                  <Badge className="bg-green-500">Verified</Badge>
                )}
                {business.claimed && (
                  <Badge variant="outline">Claimed</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {renderStars(Math.floor(business.rating))}
                  <span className="ml-1 font-semibold">{business.rating}</span>
                  <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
                </div>
                
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{business.address.line1}, {business.address.city}</span>
                </div>
                
                <div className={`flex items-center gap-1 ${hoursStatus?.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  <Clock className="h-4 w-4" />
                  <span>{hoursStatus?.isOpen ? 'Open now' : 'Closed'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {business.categories.map(categoryId => {
                  const category = categories.find(c => c.id === categoryId);
                  return (
                    <Badge key={categoryId} variant="secondary">
                      {category?.icon} {category?.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
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
                    <Button variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to list</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share business</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Demo only: Call disabled</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Demo only: Email disabled</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {business.contact.website && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2" asChild>
                      <a href={business.contact.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visit website</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">{business.description}</p>
                
                {business.amenities && business.amenities.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {business.amenities.map(amenity => (
                        <Badge key={amenity} variant="outline">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Business Hours</h3>
                    <div className="space-y-2">
                      {Object.entries(business.hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium">{day}</span>
                          <span className="text-muted-foreground">
                            {hours.length > 0 ? hours.map(h => `${h.open} - ${h.close}`).join(', ') : 'Closed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      {business.contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{business.contact.phone}</span>
                        </div>
                      )}
                      {business.contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{business.contact.email}</span>
                        </div>
                      )}
                      {business.contact.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={business.contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>

                    {business.contact.socials && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Social Media</h4>
                        <div className="flex gap-2">
                          {business.contact.socials.instagram && (
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Instagram className="h-4 w-4" />
                              Instagram
                            </Button>
                          )}
                          {business.contact.socials.facebook && (
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Facebook className="h-4 w-4" />
                              Facebook
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {business.services.map(service => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{service.name}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {service.priceMin && service.priceMax && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>BD {service.priceMin} - BD {service.priceMax}</span>
                          </div>
                        )}
                        {service.durationMin && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{service.durationMin} minutes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Offers</CardTitle>
              </CardHeader>
              <CardContent>
                {business.offers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {business.offers.map(offer => (
                      <div key={offer.id} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <h3 className="font-semibold mb-2">{offer.title}</h3>
                        {offer.description && (
                          <p className="text-sm text-muted-foreground mb-3">{offer.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Valid until {new Date(offer.validTo).toLocaleDateString()}</span>
                        </div>
                        {offer.terms && (
                          <p className="text-xs text-muted-foreground mt-2">{offer.terms}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No current offers available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Photos & Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="photos" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="photos" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Photos ({business.media.photos.length})
                    </TabsTrigger>
                    <TabsTrigger value="videos" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Videos ({business.media.videos.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="photos" className="mt-4">
                    {business.media.photos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {business.media.photos.map((photo, index) => (
                          <div
                            key={index}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick(photo)}
                          >
                            <img
                              src={photo}
                              alt={`${business.name} photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No photos available.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="videos" className="mt-4">
                    {business.media.videos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {business.media.videos.map((_, index) => (
                          <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            <Video className="h-12 w-12 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No videos available.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Reviews</CardTitle>
                  <Dialog open={isWriteReviewOpen} onOpenChange={setIsWriteReviewOpen}>
                    <DialogTrigger asChild>
                      <Button>Write a Review</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Rating</label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(rating => (
                              <Star key={rating} className="h-6 w-6 text-gray-300 cursor-pointer hover:text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Review</label>
                          <Textarea placeholder="Share your experience..." className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsWriteReviewOpen(false)}>
                            Cancel
                          </Button>
                          <Button disabled>
                            Submit Review
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold mb-2">{business.rating}</div>
                      <div className="flex justify-center mb-2">
                        {renderStars(Math.floor(business.rating))}
                      </div>
                      <p className="text-muted-foreground">{business.reviewCount} reviews</p>
                    </div>
                    {renderReviewBreakdown()}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="flex gap-4 mb-4">
                      <Select value={reviewSort} onValueChange={(value: any) => setReviewSort(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="highest">Highest</SelectItem>
                          <SelectItem value="lowest">Lowest</SelectItem>
                          <SelectItem value="most_helpful">Most Helpful</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={reviewFilter?.toString() || 'all'} onValueChange={(value: any) => setReviewFilter(value === 'all' ? null : parseInt(value))}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="5">5 stars</SelectItem>
                          <SelectItem value="4">4 stars</SelectItem>
                          <SelectItem value="3">3 stars</SelectItem>
                          <SelectItem value="2">2 stars</SelectItem>
                          <SelectItem value="1">1 star</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      {reviews
                        .filter(review => !reviewFilter || review.rating === reviewFilter)
                        .map(review => (
                        <div key={review.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{review.userId.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{review.userId}</p>
                                <div className="flex items-center gap-1">
                                  {renderStars(review.rating)}
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReviewReply(review)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-muted-foreground mb-3">{review.text}</p>
                          {review.photos && review.photos.length > 0 && (
                            <div className="flex gap-2 mb-3">
                              {review.photos.map((photo, index) => (
                                <img
                                  key={index}
                                  src={photo}
                                  alt={`Review photo ${index + 1}`}
                                  className="w-16 h-16 rounded-lg object-cover cursor-pointer"
                                  onClick={() => handleImageClick(photo)}
                                />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Button variant="ghost" size="sm" className="h-8">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Helpful
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8">
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Image Lightbox */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Business photo"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Reply Drawer */}
        <Drawer open={isReplyDrawerOpen} onOpenChange={setIsReplyDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Reply to Review</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              {selectedReview && (
                <div className="border rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{selectedReview.userId.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedReview.userId}</p>
                      <div className="flex items-center gap-1">
                        {renderStars(selectedReview.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedReview.text}</p>
                </div>
              )}
              <Textarea placeholder="Write your reply..." />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsReplyDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button disabled>
                  Send Reply
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}