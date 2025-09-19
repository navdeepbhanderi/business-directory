import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Edit2, Trash2, MapPin, Star, Clock, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useListsStore } from '@/store/listsSlice';
import { useAuthStore } from '@/store/authSlice';
import { getBusiness } from '@/lib/api';
import type { Business } from '@/lib/api';
import { toast } from 'sonner';

export default function Lists() {
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [loading, setLoading] = useState(true);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  
  const { user, role } = useAuthStore();
  const { favorites, lists, createList, renameList, deleteList, removeFromList } = useListsStore();

  useEffect(() => {
    loadBusinesses();
  }, [favorites, lists]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const allBusinessIds = new Set([
        ...favorites,
        ...lists.flatMap(list => list.items)
      ]);

      const businessPromises = Array.from(allBusinessIds).map(async (businessId) => {
        try {
          const business = await getBusiness(businessId);
          return [businessId, business];
        } catch (error) {
          console.error(`Failed to load business ${businessId}:`, error);
          return [businessId, null];
        }
      });

      const businessResults = await Promise.all(businessPromises);
      const businessMap = Object.fromEntries(
        businessResults.filter(([_, business]) => business !== null)
      );
      
      setBusinesses(businessMap);
    } catch (error) {
      console.error('Failed to load businesses:', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    try {
      await createList(newListName.trim());
      setNewListName('');
      setIsCreatingList(false);
      toast.success('List created');
    } catch (error) {
      toast.error('Failed to create list');
    }
  };

  const handleStartEdit = (listId: string, currentName: string) => {
    setEditingListId(listId);
    setEditingName(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editingListId || !editingName.trim()) return;
    
    try {
      await renameList(editingListId, editingName.trim());
      setEditingListId(null);
      setEditingName('');
      toast.success('List renamed');
    } catch (error) {
      toast.error('Failed to rename list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) return;
    
    try {
      await deleteList(listId);
      toast.success('List deleted');
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  const handleRemoveFromList = async (listId: string, businessId: string) => {
    try {
      await removeFromList(listId, businessId);
      toast.success('Removed from list');
    } catch (error) {
      toast.error('Failed to remove from list');
    }
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

  if (role === 'guest' || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">My Lists</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to save businesses and create custom lists.
          </p>
          <Button asChild>
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Account Navigation */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">My Account</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/account/lists" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                My Lists & Favorites
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/account/notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">My Lists</h2>
          <Button onClick={() => setIsCreatingList(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </div>

        {/* Create List Dialog */}
        <Dialog open={isCreatingList} onOpenChange={setIsCreatingList}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="List name"
                value={newListName}
                onChange={(e: any) => setNewListName(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') handleCreateList();
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingList(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateList} disabled={!newListName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Favorites */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                  Favorites
                  <Badge variant="secondary">{favorites.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-12 w-12 bg-muted rounded-lg animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : favorites.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No favorites yet. Start saving businesses you love!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {favorites.map(businessId => {
                      const business = businesses[businessId];
                      if (!business) return null;
                      
                      return (
                        <div key={businessId} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Avatar className="h-12 w-12">
                            {business.media.photos[0] ? (
                              <AvatarImage src={business.media.photos[0]} alt={business.name} />
                            ) : (
                              <AvatarFallback>{business.name.charAt(0)}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{business.name}</h3>
                            <div className="flex items-center gap-1 mb-1">
                              {renderStars(Math.floor(business.rating))}
                              <span className="text-sm text-muted-foreground">
                                {business.rating} ({business.reviewCount})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{business.address.city}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Custom Lists */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {lists.map(list => (
                <Card key={list.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {editingListId === list.id ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e: any) => setEditingName(e.target.value)}
                            onKeyDown={(e: any) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') {
                                setEditingListId(null);
                                setEditingName('');
                              }
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingListId(null);
                              setEditingName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="flex items-center gap-2">
                            {list.name}
                            <Badge variant="secondary">{list.items.length}</Badge>
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(list.id, list.name)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteList(list.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {list.items.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        This list is empty. Add some businesses!
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {list.items.map(businessId => {
                          const business = businesses[businessId];
                          if (!business) return null;
                          
                          return (
                            <div key={businessId} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <Avatar className="h-16 w-16">
                                {business.media.photos[0] ? (
                                  <AvatarImage src={business.media.photos[0]} alt={business.name} />
                                ) : (
                                  <AvatarFallback>{business.name.charAt(0)}</AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate">{business.name}</h3>
                                <div className="flex items-center gap-1 mb-1">
                                  {renderStars(Math.floor(business.rating))}
                                  <span className="text-sm text-muted-foreground">
                                    {business.rating} ({business.reviewCount})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{business.address.city}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-green-600">
                                  <Clock className="h-3 w-3" />
                                  <span>Open now</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromList(list.id, businessId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {lists.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No custom lists yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first list to organize your favorite businesses.
                    </p>
                    <Button onClick={() => setIsCreatingList(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First List
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}