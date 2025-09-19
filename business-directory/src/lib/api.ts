import businessesData from '@/data/businesses.json';
import categoriesData from '@/data/categories.json';
import reviewsData from '@/data/reviews.json';
import usersData from '@/data/users.json';
import adminData from '@/data/admin.json';

// Types
export interface Business {
  id: string;
  slug: string;
  name: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  address: {
    line1: string;
    city: string;
    country: string;
    postalCode?: string;
  };
  geo: {
    lat: number;
    lng: number;
  };
  hours: Record<string, Array<{ open: string; close: string }>>;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    socials?: {
      instagram?: string;
      facebook?: string;
      tiktok?: string;
    };
  };
  amenities?: string[];
  media: {
    photos: string[];
    videos: string[];
  };
  services: Array<{
    id: string;
    name: string;
    priceMin?: number;
    priceMax?: number;
    durationMin?: number;
  }>;
  offers: Array<{
    id: string;
    title: string;
    description?: string;
    validFrom: string;
    validTo: string;
    terms?: string;
  }>;
  verified: boolean;
  claimed: boolean;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  photos?: string[];
  createdAt: string;
  status: 'published' | 'flagged';
}

export interface User {
  id: string;
  name: string;
  role: 'guest' | 'user' | 'owner' | 'admin';
  premium?: boolean;
  favorites: string[];
  lists: Array<{
    id: string;
    name: string;
    items: string[];
  }>;
}

export interface SearchParams {
  q?: string;
  categoryIds?: string[];
  location?: { lat: number; lng: number } | string;
  openNow?: boolean;
  minRating?: number;
  distanceKm?: number;
  sort?: 'best_rated' | 'most_reviewed' | 'nearest' | 'newest';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: Business[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewsResult {
  items: Review[];
  stats: {
    avg: number;
    countsByStar: Record<1 | 2 | 3 | 4 | 5, number>;
  };
}

// Mock API functions with artificial latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const simulateError = () => Math.random() < 0.05; // 5% error rate

export const searchBusinesses = async (params: SearchParams): Promise<SearchResult> => {
  await delay(200 + Math.random() * 400); // 200-600ms delay
  
  if (simulateError()) {
    throw new Error('Search failed. Please try again.');
  }

  let results = businessesData as any[];

  // Apply filters
  if (params.q) {
    const query = params.q.toLowerCase();
    results = results.filter((b: any) => 
      b.name.toLowerCase().includes(query) ||
      b.description.toLowerCase().includes(query) ||
      b.categories.some((cat: string) => cat.toLowerCase().includes(query))
    );
  }

  if (params.categoryIds && params.categoryIds.length > 0) {
    results = results.filter((b: any) => 
      params.categoryIds!.some(catId => b.categories.includes(catId))
    );
  }

  if (params.minRating) {
    results = results.filter((b: any) => b.rating >= params.minRating!);
  }

  if (params.openNow) {
    const now = new Date();
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    results = results.filter((b: any) => {
      const hours = b.hours[currentDay];
      if (!hours || hours.length === 0) return false;
      
      return hours.some((slot: any) => {
        const openTime = parseInt(slot.open.replace(':', ''));
        const closeTime = parseInt(slot.close.replace(':', ''));
        return currentTime >= openTime && currentTime <= closeTime;
      });
    });
  }

  // Apply sorting
  if (params.sort) {
    switch (params.sort) {
      case 'best_rated':
        results.sort((a: any, b: any) => b.rating - a.rating);
        break;
      case 'most_reviewed':
        results.sort((a: any, b: any) => b.reviewCount - a.reviewCount);
        break;
      case 'newest':
        // Mock newest by randomizing
        results.sort(() => Math.random() - 0.5);
        break;
      case 'nearest':
        // Mock nearest by randomizing
        results.sort(() => Math.random() - 0.5);
        break;
    }
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    items: results.slice(startIndex, endIndex),
    total: results.length,
    page,
    pageSize
  };
};

export const getBusiness = async (slug: string): Promise<Business | null> => {
  await delay(150 + Math.random() * 200);
  
  if (simulateError()) {
    throw new Error('Failed to load business details.');
  }

  const business = (businessesData as any[]).find((b: any) => b.slug === slug);
  return business || null;
};

export const getReviews = async (businessId: string, params?: { sort?: string; filter?: number }): Promise<ReviewsResult> => {
  await delay(100 + Math.random() * 200);
  
  if (simulateError()) {
    throw new Error('Failed to load reviews.');
  }

  let reviews = (reviewsData as any[]).filter((r: any) => r.businessId === businessId && r.status === 'published');

  // Apply sorting
  if (params?.sort) {
    switch (params.sort) {
      case 'newest':
        reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'highest':
        reviews.sort((a: any, b: any) => b.rating - a.rating);
        break;
      case 'lowest':
        reviews.sort((a: any, b: any) => a.rating - b.rating);
        break;
      case 'most_helpful':
        // Mock by randomizing
        reviews.sort(() => Math.random() - 0.5);
        break;
    }
  }

  // Apply rating filter
  if (params?.filter) {
    reviews = reviews.filter((r: any) => r.rating === params.filter);
  }

  // Calculate stats
  const avg = reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length : 0;
  const countsByStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r: any) => {
    countsByStar[r.rating as keyof typeof countsByStar]++;
  });

  return {
    items: reviews,
    stats: { avg, countsByStar }
  };
};

export const getCategories = async (): Promise<Category[]> => {
  await delay(100);
  return categoriesData as Category[];
};

export const addToFavorites = async (businessId: string, userId: string): Promise<void> => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to add to favorites.');
  }

  // This would update the user's favorites in a real app
  console.log(`Added business ${businessId} to favorites for user ${userId}`);
};

export const removeFromFavorites = async (businessId: string, userId: string): Promise<void> => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to remove from favorites.');
  }

  console.log(`Removed business ${businessId} from favorites for user ${userId}`);
};

export const createList = async (name: string, userId: string): Promise<{ id: string; name: string; items: string[] }> => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to create list.');
  }

  const newList = {
    id: `list_${Date.now()}`,
    name,
    items: []
  };

  console.log(`Created list "${name}" for user ${userId}`);
  return newList;
};

export const addToList = async (listId: string, businessId: string, userId: string): Promise<void> => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to add to list.');
  }

  console.log(`Added business ${businessId} to list ${listId} for user ${userId}`);
};

export const removeFromList = async (listId: string, businessId: string, userId: string): Promise<void> => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to remove from list.');
  }

  console.log(`Removed business ${businessId} from list ${listId} for user ${userId}`);
};

export const getOwnerDashboard = async (_userId: string) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to load dashboard.');
  }

  return {
    kpis: {
      views: 1250,
      calls: 45,
      messages: 23,
      saves: 89
    },
    profileScore: 75,
    recentReviews: (reviewsData as any[]).slice(0, 5)
  };
};

export const getAdminQueues = async () => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to load admin queues.');
  }

  return adminData.queues;
};

export const approveListing = async (id: string, type: 'claim' | 'registration') => {
  await delay(400);
  
  if (simulateError()) {
    throw new Error('Failed to approve listing.');
  }

  console.log(`Approved ${type} ${id}`);
};

export const rejectListing = async (id: string, reason: string, type: 'claim' | 'registration') => {
  await delay(400);
  
  if (simulateError()) {
    throw new Error('Failed to reject listing.');
  }

  console.log(`Rejected ${type} ${id} with reason: ${reason}`);
};

export const submitClaim = async (payload: any) => {
  await delay(500);
  
  if (simulateError()) {
    throw new Error('Failed to submit claim.');
  }

  const claimId = `claim_${Date.now()}`;
  console.log(`Submitted claim ${claimId}`, payload);
  
  return { id: claimId, status: 'pending' };
};

export const registerBusiness = async (payload: any) => {
  await delay(500);
  
  if (simulateError()) {
    throw new Error('Failed to register business.');
  }

  const registrationId = `reg_${Date.now()}`;
  console.log(`Registered business ${registrationId}`, payload);
  
  return { id: registrationId, status: 'submitted' };
};

export const updatePricing = async (plans: any[]) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to update pricing.');
  }

  console.log('Updated pricing plans', plans);
};

export const updatePremium = async (order: string[]) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to update premium placements.');
  }

  console.log('Updated premium placements order', order);
};

export const getUsers = async (params?: { search?: string; role?: string; status?: string }) => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to load users.');
  }

  let users = usersData as User[];

  if (params?.search) {
    const search = params.search.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(search));
  }

  if (params?.role) {
    users = users.filter(u => u.role === params.role);
  }

  return users;
};

export const banUser = async (userId: string) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to ban user.');
  }

  console.log(`Banned user ${userId}`);
};

export const unbanUser = async (userId: string) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to unban user.');
  }

  console.log(`Unbanned user ${userId}`);
};

export const resetPassword = async (userId: string) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to reset password.');
  }

  console.log(`Reset password for user ${userId}`);
};

export const getReportedReviews = async () => {
  await delay(200);
  
  if (simulateError()) {
    throw new Error('Failed to load reported reviews.');
  }

  return adminData.reportedReviews;
};

export const dismissReport = async (reportId: string) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to dismiss report.');
  }

  console.log(`Dismissed report ${reportId}`);
};

export const removeReview = async (reviewId: string) => {
  await delay(300);
  
  if (simulateError()) {
    throw new Error('Failed to remove review.');
  }

  console.log(`Removed review ${reviewId}`);
};

export const getPricingPlans = async () => {
  await delay(100);
  return adminData.pricingPlans;
};

export const getPremiumPlacements = async () => {
  await delay(100);
  return adminData.premiumPlacements;
};