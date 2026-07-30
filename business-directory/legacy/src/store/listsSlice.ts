import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BusinessList {
  id: string;
  name: string;
  items: string[];
}

interface ListsState {
  favorites: string[];
  lists: BusinessList[];
  addToFavorites: (businessId: string) => Promise<void>;
  removeFromFavorites: (businessId: string) => Promise<void>;
  createList: (name: string) => Promise<BusinessList>;
  deleteList: (listId: string) => Promise<void>;
  renameList: (listId: string, name: string) => Promise<void>;
  addToList: (listId: string, businessId: string) => Promise<void>;
  removeFromList: (listId: string, businessId: string) => Promise<void>;
  isFavorite: (businessId: string) => boolean;
}

export const useListsStore = create<ListsState>()(
  persist(
    (set, get) => ({
      favorites: [],
      lists: [],
      addToFavorites: async (businessId) => {
        set((state) => ({
          favorites: [...state.favorites, businessId],
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      removeFromFavorites: async (businessId) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== businessId),
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      createList: async (name) => {
        const newList = {
          id: `list_${Date.now()}`,
          name,
          items: [],
        };
        set((state) => ({
          lists: [...state.lists, newList],
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
        return newList;
      },
      deleteList: async (listId) => {
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== listId),
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      renameList: async (listId, name) => {
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId ? { ...list, name } : list
          ),
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      addToList: async (listId, businessId) => {
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? { ...list, items: [...list.items, businessId] }
              : list
          ),
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      removeFromList: async (listId, businessId) => {
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? { ...list, items: list.items.filter((id) => id !== businessId) }
              : list
          ),
        }));
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      isFavorite: (businessId) => get().favorites.includes(businessId),
    }),
    {
      name: 'lists-storage',
    }
  )
);