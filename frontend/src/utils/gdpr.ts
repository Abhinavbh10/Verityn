import { secureStorage } from './secureStorage';

const GDPR_CONSENT_KEY = 'gdpr-consent';
const GDPR_CONSENT_DATE_KEY = 'gdpr-consent-date';

export interface GDPRConsent {
  analytics: boolean;
  personalization: boolean;
  localStorage: boolean;
  consentGiven: boolean;
  consentDate: string | null;
}

export const DEFAULT_CONSENT: GDPRConsent = {
  analytics: false,
  personalization: true,
  localStorage: true,
  consentGiven: false,
  consentDate: null,
};

// Check if user has given GDPR consent
export const hasGDPRConsent = async (): Promise<boolean> => {
  try {
    const consent = await secureStorage.getItem(GDPR_CONSENT_KEY);
    if (consent) {
      const parsed = JSON.parse(consent);
      return parsed.consentGiven === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking GDPR consent:', error);
    return false;
  }
};

// Get current GDPR consent settings
export const getGDPRConsent = async (): Promise<GDPRConsent> => {
  try {
    const consent = await secureStorage.getItem(GDPR_CONSENT_KEY);
    if (consent) {
      return JSON.parse(consent);
    }
    return DEFAULT_CONSENT;
  } catch (error) {
    console.error('Error getting GDPR consent:', error);
    return DEFAULT_CONSENT;
  }
};

// Save GDPR consent
export const saveGDPRConsent = async (consent: Partial<GDPRConsent>): Promise<void> => {
  try {
    const currentConsent = await getGDPRConsent();
    const newConsent: GDPRConsent = {
      ...currentConsent,
      ...consent,
      consentGiven: true,
      consentDate: new Date().toISOString(),
    };
    await secureStorage.setItem(GDPR_CONSENT_KEY, JSON.stringify(newConsent));
  } catch (error) {
    console.error('Error saving GDPR consent:', error);
  }
};

// Withdraw GDPR consent and delete all user data
export const withdrawConsentAndDeleteData = async (): Promise<boolean> => {
  try {
    // List of all user data keys to delete
    const keysToDelete = [
      'user-preferences',
      'bookmarked-articles',
      'user-keywords',
      'theme-preference',
      'offline-articles',
      'user-locations',
      'location-requests',
      'has-completed-onboarding',
      GDPR_CONSENT_KEY,
    ];

    // Delete all user data
    for (const key of keysToDelete) {
      await secureStorage.deleteItem(key);
    }

    return true;
  } catch (error) {
    console.error('Error deleting user data:', error);
    return false;
  }
};

// Get list of data stored about user (for transparency)
export const getStoredDataSummary = async (): Promise<string[]> => {
  const summary: string[] = [];
  
  try {
    const prefs = await secureStorage.getItem('user-preferences');
    if (prefs) summary.push('News category preferences');

    const bookmarks = await secureStorage.getItem('bookmarked-articles');
    if (bookmarks) {
      const parsed = JSON.parse(bookmarks);
      summary.push(`${parsed.length} bookmarked articles`);
    }

    const keywords = await secureStorage.getItem('user-keywords');
    if (keywords) {
      const parsed = JSON.parse(keywords);
      summary.push(`${parsed.length} custom keywords`);
    }

    const locations = await secureStorage.getItem('user-locations');
    if (locations) summary.push('Location preferences (countries/cities)');

    const theme = await secureStorage.getItem('theme-preference');
    if (theme) summary.push('Theme preference');

    const offline = await secureStorage.getItem('offline-articles');
    if (offline) {
      const parsed = JSON.parse(offline);
      summary.push(`${parsed.length} offline articles`);
    }
  } catch (error) {
    console.error('Error getting stored data summary:', error);
  }

  return summary;
};
