import { secureStorage } from './secureStorage';

const OFFLINE_ARTICLES_KEY = 'verityn_offline_articles';

export interface OfflineArticle {
  id: string;
  title: string;
  description: string;
  fullContent?: string;
  link: string;
  published: string;
  source: string;
  category: string;
  image_url?: string;
  savedAt: string;
}

export const getOfflineArticles = async (): Promise<OfflineArticle[]> => {
  try {
    const stored = await secureStorage.getItem(OFFLINE_ARTICLES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting offline articles:', error);
  }
  return [];
};

export const saveArticleOffline = async (article: Omit<OfflineArticle, 'savedAt'>): Promise<boolean> => {
  try {
    const articles = await getOfflineArticles();
    const exists = articles.some(a => a.id === article.id);
    if (exists) return false;
    
    const newArticle: OfflineArticle = {
      ...article,
      savedAt: new Date().toISOString(),
    };
    
    articles.unshift(newArticle);
    
    // Limit to 50 offline articles to manage storage
    const trimmed = articles.slice(0, 50);
    await secureStorage.setItem(OFFLINE_ARTICLES_KEY, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    console.error('Error saving article offline:', error);
    return false;
  }
};

export const removeOfflineArticle = async (articleId: string): Promise<boolean> => {
  try {
    const articles = await getOfflineArticles();
    const filtered = articles.filter(a => a.id !== articleId);
    await secureStorage.setItem(OFFLINE_ARTICLES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing offline article:', error);
    return false;
  }
};

export const isArticleSavedOffline = async (articleId: string): Promise<boolean> => {
  try {
    const articles = await getOfflineArticles();
    return articles.some(a => a.id === articleId);
  } catch (error) {
    console.error('Error checking offline article:', error);
    return false;
  }
};

export const clearAllOfflineArticles = async (): Promise<boolean> => {
  try {
    await secureStorage.deleteItem(OFFLINE_ARTICLES_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing offline articles:', error);
    return false;
  }
};

export const getOfflineArticleCount = async (): Promise<number> => {
  const articles = await getOfflineArticles();
  return articles.length;
};
