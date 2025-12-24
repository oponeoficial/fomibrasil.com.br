// Matches 'users' table
export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  profile_photo_url: string;
  bio?: string;
  city?: string;
  neighborhood?: string;
  reviews_count?: number; // Calculated/Joined
  followers_count?: number; // Calculated/Joined
  following_count?: number; // Calculated/Joined
  is_verified?: boolean;
  onboarding_completed?: boolean;
  
  // Preferences (from users table JSONB columns)
  cuisines_disliked?: string[];
  occasions?: string[];
  place_types?: string[];
  dietary_restrictions?: string[];
}

// Matches 'restaurants' table
export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  photo_url: string;
  cuisine_types?: string[]; // JSONB
  occasions?: string[]; // JSONB
  price_level?: number;
  rating?: number;
  reviews_count?: number;
  review_count?: number;
  google_place_id?: string;
  opening_hours?: string[] | { weekday_text?: string[] };  // NOVO
  is_open_now?: boolean;  // NOVO

  // UI Helpers (Optional)
  type?: string;
  description?: string;
  distance?: string;
  coords?: { x: number; y: number };
}

// Matches 'reviews' table
export interface Review {
  id: string;
  user_id: string;
  user?: User; // Joined
  restaurant_id: string;
  restaurant?: Restaurant; // Joined
  title: string;
  description: string;
  review_type: 'in_person' | 'delivery';
  average_score: number;
  photos: { url: string; order: number }[]; // JSONB
  created_at: string;
  
  // Frontend helpers
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
}

// Matches 'comments' table
export interface Comment {
  id: string;
  user_id: string;
  user?: User;
  review_id: string;
  content: string;
  created_at: string;
}

// Matches 'lists' table
export interface List {
  id: string;
  user_id: string;
  name: string;
  cover_photo_url?: string;
  is_private: boolean;
  is_default: boolean;
  
  // Frontend helpers
  count?: number;
  items?: string[]; // Array of restaurant IDs for easy checking
}

// Helper types for App logic
export interface UserPreferences {
  dislikes: string[];
  occasions: string[];
  radar: {
    frequency: string;
    placeTypes: string[];
    behavior: string[];
  };
  restrictions: string[];
}

export enum OnboardingStep {
  DISLIKES = 1,
  OCCASIONS = 2,
  RADAR = 3,
  RESTRICTIONS = 4
}

export interface RecommendationSection {
  title: string;
  subtitle: string;
  items: { restaurantId: string; score: number }[];
}