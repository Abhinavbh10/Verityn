import { appStorage } from './asyncStorage';

const BOOKMARKS_KEY = 'verityn_bookmarked_articles';

export interface BookmarkedArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  category: string;
  image_url?: string;
  bookmarkedAt: string;
}

export const getBookmarks = async (): Promise<BookmarkedArticle[]> => {
  try {
    const stored = await appStorage.getItem(BOOKMARKS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting bookmarks:', error);
  }
  return [];
};

export const addBookmark = async (article: Omit<BookmarkedArticle, 'bookmarkedAt'>): Promise<boolean> => {
  try {
    const bookmarks = await getBookmarks();
    const exists = bookmarks.some(b => b.id === article.id);
    if (exists) return false;
    
    const newBookmark: BookmarkedArticle = {
      ...article,
      bookmarkedAt: new Date().toISOString(),
    };
    
    bookmarks.unshift(newBookmark);
    await appStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return false;
  }
};

export const removeBookmark = async (articleId: string): Promise<boolean> => {
  try {
    const bookmarks = await getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== articleId);
    await appStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }
};

export const isBookmarked = async (articleId: string): Promise<boolean> => {
  try {
    const bookmarks = await getBookmarks();
    return bookmarks.some(b => b.id === articleId);
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return false;
  }
};

export const clearAllBookmarks = async (): Promise<boolean> => {
  try {
    // Set to empty array instead of deleting, to avoid any null issues
    await appStorage.setItem(BOOKMARKS_KEY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing bookmarks:', error);
    return false;
  }
};
