import { useState } from 'react';
import { Plus, Heart, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useListsStore } from '@/store/listsSlice';
import { useAuthStore } from '@/store/authSlice';
import { toast } from 'sonner';

interface ListsManagerProps {
  businessId: string;
  businessName: string;
  businessImage?: string;
  onClose?: () => void;
}

export function ListsManager({ businessId, businessName, businessImage }: ListsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const { user, role } = useAuthStore();
  const { favorites, lists, addToFavorites, removeFromFavorites, createList, addToList, removeFromList, renameList, deleteList } = useListsStore();
  
  const isInFavorites = favorites.includes(businessId);
  const businessInLists = lists.filter(list => list.items.includes(businessId));

  const handleToggleFavorites = async () => {
    try {
      if (isInFavorites) {
        await removeFromFavorites(businessId);
        toast.success('Removed from favorites');
      } else {
        await addToFavorites(businessId);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleAddToList = async (listId: string) => {
    try {
      await addToList(listId, businessId);
      toast.success('Added to list');
    } catch (error) {
      toast.error('Failed to add to list');
    }
  };

  const handleRemoveFromList = async (listId: string) => {
    try {
      await removeFromList(listId, businessId);
      toast.success('Removed from list');
    } catch (error) {
      toast.error('Failed to remove from list');
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    try {
      const newList = await createList(newListName.trim());
      await addToList(newList.id, businessId);
      setNewListName('');
      setIsCreatingList(false);
      toast.success('List created and business added');
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
    if (!confirm('Are you sure you want to delete this list?')) return;
    
    try {
      await deleteList(listId);
      toast.success('List deleted');
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  if (role === 'guest' || !user) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign in to save businesses</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add to List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Lists</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Business Preview */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Avatar className="h-12 w-12">
              {businessImage ? (
                <AvatarImage src={businessImage} alt={businessName} />
              ) : (
                <AvatarFallback>{businessName.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">{businessName}</h3>
              <p className="text-sm text-muted-foreground">Add to your lists</p>
            </div>
          </div>

          {/* Favorites */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Favorites
            </h4>
            <Button
              variant={isInFavorites ? "default" : "outline"}
              className="w-full justify-start"
              onClick={handleToggleFavorites}
            >
              <Heart className={`h-4 w-4 mr-2 ${isInFavorites ? 'fill-current' : ''}`} />
              {isInFavorites ? 'Remove from Favorites' : 'Add to Favorites'}
            </Button>
          </div>

          {/* Custom Lists */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Custom Lists</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingList(true)}
                className="h-8 px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {isCreatingList && (
              <div className="flex gap-2">
                <Input
                  placeholder="List name"
                  value={newListName}
                  onChange={(e: any) => setNewListName(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') handleCreateList();
                    if (e.key === 'Escape') {
                      setIsCreatingList(false);
                      setNewListName('');
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateList}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreatingList(false);
                    setNewListName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lists.map(list => {
                const isInList = list.items.includes(businessId);
                
                return (
                  <div key={list.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex-1">
                      {editingListId === list.id ? (
                        <div className="flex gap-2">
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
                            className="h-8"
                          />
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingListId(null);
                              setEditingName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{list.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(list.id, list.name)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteList(list.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingListId !== list.id && (
                      <Button
                        variant={isInList ? "default" : "outline"}
                        size="sm"
                        onClick={() => isInList ? handleRemoveFromList(list.id) : handleAddToList(list.id)}
                      >
                        {isInList ? 'Remove' : 'Add'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {lists.length === 0 && !isCreatingList && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No custom lists yet. Create your first list!
              </p>
            )}
          </div>

          {/* Current Lists */}
          {businessInLists.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Currently in:</h4>
              <div className="flex flex-wrap gap-2">
                {businessInLists.map(list => (
                  <Badge key={list.id} variant="secondary">
                    {list.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}