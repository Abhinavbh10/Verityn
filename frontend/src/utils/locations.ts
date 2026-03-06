import { secureStorage } from './secureStorage';

const LOCATIONS_KEY = 'user-locations';
const LOCATION_REQUESTS_KEY = 'location-requests';

// European countries with major cities
export interface Country {
  id: string;
  name: string;
  flag: string;
  cities: string[];
}

export const EUROPEAN_COUNTRIES: Country[] = [
  // Europe
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool', 'Bristol', 'Leeds'] },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', cities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig'] },
  { id: 'france', name: 'France', flag: '🇫🇷', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux', 'Strasbourg', 'Lille'] },
  { id: 'spain', name: 'Spain', flag: '🇪🇸', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga', 'Zaragoza'] },
  { id: 'italy', name: 'Italy', flag: '🇮🇹', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Venice', 'Bologna', 'Palermo'] },
  { id: 'netherlands', name: 'Netherlands', flag: '🇳🇱', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'] },
  { id: 'belgium', name: 'Belgium', flag: '🇧🇪', cities: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liège'] },
  { id: 'switzerland', name: 'Switzerland', flag: '🇨🇭', cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'] },
  { id: 'austria', name: 'Austria', flag: '🇦🇹', cities: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz'] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', cities: ['Lisbon', 'Porto', 'Braga', 'Faro', 'Coimbra'] },
  { id: 'ireland', name: 'Ireland', flag: '🇮🇪', cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'] },
  { id: 'sweden', name: 'Sweden', flag: '🇸🇪', cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala'] },
  { id: 'norway', name: 'Norway', flag: '🇳🇴', cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'] },
  { id: 'denmark', name: 'Denmark', flag: '🇩🇰', cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg'] },
  { id: 'finland', name: 'Finland', flag: '🇫🇮', cities: ['Helsinki', 'Espoo', 'Tampere', 'Turku'] },
  { id: 'poland', name: 'Poland', flag: '🇵🇱', cities: ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw', 'Poznan'] },
  { id: 'czechia', name: 'Czech Republic', flag: '🇨🇿', cities: ['Prague', 'Brno', 'Ostrava', 'Pilsen'] },
  { id: 'greece', name: 'Greece', flag: '🇬🇷', cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion'] },
  // North America
  { id: 'usa', name: 'United States', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Miami', 'Boston', 'Seattle', 'Washington DC', 'Atlanta', 'Denver', 'Dallas', 'Austin', 'San Diego', 'Phoenix'] },
  { id: 'canada', name: 'Canada', flag: '🇨🇦', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'] },
  // Asia Pacific
  { id: 'australia', name: 'Australia', flag: '🇦🇺', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
  { id: 'india', name: 'India', flag: '🇮🇳', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'] },
];

export interface UserLocationPreference {
  countries: string[];  // country IDs
  cities: string[];     // city names
}

// Get user's location preferences
export const getLocationPreferences = async (): Promise<UserLocationPreference> => {
  try {
    const stored = await secureStorage.getItem(LOCATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting location preferences:', error);
  }
  return { countries: [], cities: [] };
};

// Save location preferences
export const saveLocationPreferences = async (prefs: UserLocationPreference): Promise<void> => {
  try {
    await secureStorage.setItem(LOCATIONS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving location preferences:', error);
  }
};

// Clear location preferences
export const clearLocationPreferences = async (): Promise<void> => {
  try {
    await secureStorage.deleteItem(LOCATIONS_KEY);
  } catch (error) {
    console.error('Error clearing location preferences:', error);
  }
};

// Get country by ID
export const getCountryById = (id: string): Country | undefined => {
  return EUROPEAN_COUNTRIES.find(c => c.id === id);
};

// Request a new country (for future addition)
export const requestNewCountry = async (countryName: string): Promise<void> => {
  try {
    const stored = await secureStorage.getItem(LOCATION_REQUESTS_KEY);
    const requests = stored ? JSON.parse(stored) : [];
    if (!requests.includes(countryName.toLowerCase())) {
      requests.push(countryName.toLowerCase());
      await secureStorage.setItem(LOCATION_REQUESTS_KEY, JSON.stringify(requests));
    }
  } catch (error) {
    console.error('Error saving country request:', error);
  }
};

// Get requested countries
export const getRequestedCountries = async (): Promise<string[]> => {
  try {
    const stored = await secureStorage.getItem(LOCATION_REQUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting requested countries:', error);
    return [];
  }
};
