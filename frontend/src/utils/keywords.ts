import * as SecureStore from 'expo-secure-store';

const KEYWORDS_KEY = 'verityn_user_keywords';

export interface UserKeywords {
  keywords: string[];
  updatedAt: string;
}

export const getKeywords = async (): Promise<string[]> => {
  try {
    const stored = await SecureStore.getItemAsync(KEYWORDS_KEY);
    if (stored) {
      const data: UserKeywords = JSON.parse(stored);
      return data.keywords || [];
    }
  } catch (error) {
    console.error('Error getting keywords:', error);
  }
  return [];
};

export const saveKeywords = async (keywords: string[]): Promise<boolean> => {
  try {
    const data: UserKeywords = {
      keywords: keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0),
      updatedAt: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(KEYWORDS_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving keywords:', error);
    return false;
  }
};

export const addKeyword = async (keyword: string): Promise<boolean> => {
  try {
    const keywords = await getKeywords();
    const normalizedKeyword = keyword.trim().toLowerCase();
    
    if (!normalizedKeyword || keywords.includes(normalizedKeyword)) {
      return false;
    }
    
    keywords.push(normalizedKeyword);
    return await saveKeywords(keywords);
  } catch (error) {
    console.error('Error adding keyword:', error);
    return false;
  }
};

export const removeKeyword = async (keyword: string): Promise<boolean> => {
  try {
    const keywords = await getKeywords();
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = keywords.filter(k => k !== normalizedKeyword);
    return await saveKeywords(filtered);
  } catch (error) {
    console.error('Error removing keyword:', error);
    return false;
  }
};

export const clearKeywords = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(KEYWORDS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing keywords:', error);
    return false;
  }
};

// Suggested keywords for European news
export const SUGGESTED_KEYWORDS = [
  'immigration',
  'expat',
  'visa',
  'work permit',
  'EU law',
  'Brexit',
  'Schengen',
  'asylum',
  'citizenship',
  'residence permit',
  'digital nomad',
  'relocation',
  'tax',
  'healthcare',
  'housing',
  'startup',
  'remote work',
  'climate',
  'energy',
  'inflation',
];
