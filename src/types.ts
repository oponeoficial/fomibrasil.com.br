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
  date_of_birth?: string;
  gender?: string;
  reviews_count?: number;
  followers_count?: number;
  following_count?: number;
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
  instagram?: string;
  google_maps_url?: string;
  photo_url: string;
  cuisine_types?: string[];
  occasions?: string[];
  price_level?: number;
  rating?: number;
  reviews_count?: number;
  review_count?: number;
  google_place_id?: string;
  opening_hours?: string[] | { weekday_text?: string[] };
  is_open_now?: boolean;

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
  user?: User;
  restaurant_id: string;
  restaurant?: Restaurant;
  title: string;
  description: string;
  review_type: 'in_person' | 'delivery';
  average_score: number;
  photos: { url: string; order: number }[];
  created_at: string;
  
  // Score fields (from database)
  score_1?: number;
  score_2?: number;
  score_3?: number;
  score_4?: number;
  score_5?: number;

  // Additional review data
  voltaria?: boolean | null;
  occasions?: string[];

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
  items?: string[];
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

export interface RecommendationSection {
  title: string;
  subtitle: string;
  items: { restaurantId: string; score: number }[];
}