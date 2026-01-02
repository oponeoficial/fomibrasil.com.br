// src/services/recommendation.service.ts
// Serviço de recomendações baseado em preferências do onboarding e histórico de reviews

import { SupabaseClient } from '@supabase/supabase-js';
import { Restaurant, User } from '../types';

interface UserPreferences {
  cuisinesDisliked: string[];
  occasions: string[];
  placeTypes: string[];
  dietaryRestrictions: string[];
  neighborhood?: string;
  city?: string;
}

interface ReviewAnalysis {
  favoriteCuisines: string[];      // Culinárias com nota média >= 4
  favoriteOccasions: string[];     // Ocasiões das reviews com nota alta
  averageUserScore: number;        // Média geral das notas do usuário
  reviewedRestaurantIds: string[]; // IDs de restaurantes já avaliados
  voltariaPositive: string[];      // Restaurantes que o usuário voltaria
}

interface ScoredRestaurant extends Restaurant {
  matchScore: number;
  matchReasons: string[];
}

interface RecommendationSection {
  id: string;
  title: string;
  subtitle: string;
  items: ScoredRestaurant[];
  priority: number;
}

export const RecommendationService = {
  /**
   * Analisa o histórico de reviews do usuário
   */
  async analyzeUserReviews(supabase: SupabaseClient, userId: string): Promise<ReviewAnalysis> {
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        id,
        restaurant_id,
        average_score,
        voltaria,
        occasions,
        restaurant:restaurants!restaurant_id(id, cuisine_types)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    const analysis: ReviewAnalysis = {
      favoriteCuisines: [],
      favoriteOccasions: [],
      averageUserScore: 0,
      reviewedRestaurantIds: [],
      voltariaPositive: []
    };

    if (!reviews || reviews.length === 0) {
      return analysis;
    }

    const cuisineCounts: Record<string, { total: number; count: number }> = {};
    const occasionCounts: Record<string, number> = {};
    let totalScore = 0;

    for (const review of reviews) {
      analysis.reviewedRestaurantIds.push(review.restaurant_id);
      totalScore += review.average_score || 0;

      // Guardar restaurantes que o usuário voltaria
      if (review.voltaria === true) {
        analysis.voltariaPositive.push(review.restaurant_id);
      }

      // Só considerar reviews com nota >= 4 para preferências
      if ((review.average_score || 0) >= 4) {
        // Contar culinárias de reviews boas
        const restaurant = review.restaurant as any;
        if (restaurant?.cuisine_types) {
          for (const cuisine of restaurant.cuisine_types) {
            if (!cuisineCounts[cuisine]) {
              cuisineCounts[cuisine] = { total: 0, count: 0 };
            }
            cuisineCounts[cuisine].total += review.average_score || 0;
            cuisineCounts[cuisine].count += 1;
          }
        }

        // Contar ocasiões de reviews boas
        if (review.occasions && Array.isArray(review.occasions)) {
          for (const occasion of review.occasions) {
            occasionCounts[occasion] = (occasionCounts[occasion] || 0) + 1;
          }
        }
      }
    }

    // Calcular média geral
    analysis.averageUserScore = reviews.length > 0 ? totalScore / reviews.length : 0;

    // Pegar top culinárias (que aparecem em reviews com nota >= 4)
    analysis.favoriteCuisines = Object.entries(cuisineCounts)
      .filter(([, data]) => data.count >= 1)
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
      .slice(0, 5)
      .map(([cuisine]) => cuisine);

    // Pegar top ocasiões
    analysis.favoriteOccasions = Object.entries(occasionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([occasion]) => occasion);

    return analysis;
  },

  /**
   * Calcula score de compatibilidade entre restaurante e usuário
   */
  calculateMatchScore(
    restaurant: Restaurant,
    preferences: UserPreferences,
    reviewAnalysis: ReviewAnalysis
  ): { score: number; reasons: string[] } {
    let score = 50; // Base score
    const reasons: string[] = [];

    // === PENALIDADES (podem reduzir muito o score) ===

    // Culinária que o usuário não gosta (-30 pontos)
    if (restaurant.cuisine_types && preferences.cuisinesDisliked.length > 0) {
      const hasDisliked = restaurant.cuisine_types.some(c =>
        preferences.cuisinesDisliked.includes(c)
      );
      if (hasDisliked) {
        score -= 30;
      }
    }

    // Já avaliou este restaurante (-20 pontos, já conhece)
    if (reviewAnalysis.reviewedRestaurantIds.includes(restaurant.id)) {
      score -= 20;
    }

    // === BÔNUS (aumentam o score) ===

    // Culinária favorita baseada em reviews (+20 pontos)
    if (restaurant.cuisine_types && reviewAnalysis.favoriteCuisines.length > 0) {
      const hasFavorite = restaurant.cuisine_types.some(c =>
        reviewAnalysis.favoriteCuisines.includes(c)
      );
      if (hasFavorite) {
        score += 20;
        reasons.push('Culinária que você adora');
      }
    }

    // Ocasião preferida do usuário (+15 pontos)
    if (restaurant.occasions && preferences.occasions.length > 0) {
      const matchingOccasions = restaurant.occasions.filter((o: string) =>
        preferences.occasions.includes(o)
      );
      if (matchingOccasions.length > 0) {
        score += Math.min(15, matchingOccasions.length * 5);
        reasons.push(`Bom para ${matchingOccasions[0]}`);
      }
    }

    // Ocasião de reviews positivas (+10 pontos)
    if (restaurant.occasions && reviewAnalysis.favoriteOccasions.length > 0) {
      const hasReviewOccasion = restaurant.occasions.some((o: string) =>
        reviewAnalysis.favoriteOccasions.includes(o)
      );
      if (hasReviewOccasion) {
        score += 10;
      }
    }

    // Mesmo bairro (+15 pontos)
    if (preferences.neighborhood && restaurant.neighborhood) {
      if (restaurant.neighborhood.toLowerCase().includes(preferences.neighborhood.toLowerCase())) {
        score += 15;
        reasons.push('Perto de você');
      }
    }

    // Mesma cidade (+5 pontos)
    if (preferences.city && restaurant.city) {
      if (restaurant.city.toLowerCase().includes(preferences.city.toLowerCase())) {
        score += 5;
      }
    }

    // Rating alto no Google (+10 pontos para >= 4.5, +5 para >= 4.0)
    if (restaurant.rating) {
      if (restaurant.rating >= 4.5) {
        score += 10;
        reasons.push('Muito bem avaliado');
      } else if (restaurant.rating >= 4.0) {
        score += 5;
      }
    }

    // Muitas avaliações (popular) (+5 pontos)
    if (restaurant.review_count && restaurant.review_count >= 100) {
      score += 5;
      if (!reasons.includes('Muito bem avaliado')) {
        reasons.push('Popular');
      }
    }

    // Garantir que o score fique entre 0 e 100
    score = Math.max(0, Math.min(100, score));

    return { score, reasons };
  },

  /**
   * Busca e ordena restaurantes por compatibilidade
   */
  async getRecommendations(
    supabase: SupabaseClient,
    user: User
  ): Promise<RecommendationSection[]> {
    const sections: RecommendationSection[] = [];

    // Extrair preferências do usuário
    const preferences: UserPreferences = {
      cuisinesDisliked: user.cuisines_disliked || [],
      occasions: user.occasions || [],
      placeTypes: user.place_types || [],
      dietaryRestrictions: user.dietary_restrictions || [],
      neighborhood: user.neighborhood,
      city: user.city
    };

    // Analisar histórico de reviews
    const reviewAnalysis = await this.analyzeUserReviews(supabase, user.id);

    // Buscar todos os restaurantes ativos
    const { data: allRestaurants } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true);

    if (!allRestaurants || allRestaurants.length === 0) {
      return sections;
    }

    // Calcular score para cada restaurante
    const scoredRestaurants: ScoredRestaurant[] = allRestaurants.map(restaurant => {
      const { score, reasons } = this.calculateMatchScore(restaurant, preferences, reviewAnalysis);
      return {
        ...restaurant,
        matchScore: score,
        matchReasons: reasons
      };
    });

    // Ordenar por score
    scoredRestaurants.sort((a, b) => b.matchScore - a.matchScore);

    // === SEÇÃO 1: Para Você (melhores scores, não avaliados) ===
    const forYou = scoredRestaurants
      .filter(r => !reviewAnalysis.reviewedRestaurantIds.includes(r.id))
      .filter(r => r.matchScore >= 60)
      .slice(0, 10);

    if (forYou.length > 0) {
      sections.push({
        id: 'for-you',
        title: 'Para Você',
        subtitle: 'Baseado no seu perfil e avaliações',
        items: forYou,
        priority: 1
      });
    }

    // === SEÇÃO 2: Baseado nas suas avaliações ===
    if (reviewAnalysis.favoriteCuisines.length > 0) {
      const basedOnReviews = scoredRestaurants
        .filter(r => !reviewAnalysis.reviewedRestaurantIds.includes(r.id))
        .filter(r => {
          if (!r.cuisine_types) return false;
          return r.cuisine_types.some(c => reviewAnalysis.favoriteCuisines.includes(c));
        })
        .slice(0, 10);

      if (basedOnReviews.length > 0) {
        sections.push({
          id: 'based-on-reviews',
          title: 'Baseado nas suas avaliações',
          subtitle: `Você gosta de ${reviewAnalysis.favoriteCuisines[0]}`,
          items: basedOnReviews,
          priority: 2
        });
      }
    }

    // === SEÇÃO 3: Para suas ocasiões ===
    if (preferences.occasions.length > 0) {
      const forOccasions = scoredRestaurants
        .filter(r => !reviewAnalysis.reviewedRestaurantIds.includes(r.id))
        .filter(r => {
          if (!r.occasions) return false;
          return r.occasions.some((o: string) => preferences.occasions.includes(o));
        })
        .slice(0, 10);

      if (forOccasions.length > 0) {
        sections.push({
          id: 'for-occasions',
          title: 'Para suas ocasiões',
          subtitle: `Perfeitos para ${preferences.occasions[0]?.toLowerCase()}`,
          items: forOccasions,
          priority: 3
        });
      }
    }

    // === SEÇÃO 4: Perto de você ===
    if (preferences.neighborhood) {
      const nearby = scoredRestaurants
        .filter(r => r.neighborhood?.toLowerCase().includes(preferences.neighborhood!.toLowerCase()))
        .slice(0, 10);

      if (nearby.length > 0) {
        sections.push({
          id: 'nearby',
          title: 'Perto de você',
          subtitle: `Em ${preferences.neighborhood}`,
          items: nearby,
          priority: 4
        });
      }
    }

    // === SEÇÃO 5: Mais bem avaliados ===
    const topRated = scoredRestaurants
      .filter(r => (r.rating || 0) >= 4.0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);

    if (topRated.length > 0) {
      sections.push({
        id: 'top-rated',
        title: 'Mais Bem Avaliados',
        subtitle: 'Os favoritos da comunidade',
        items: topRated,
        priority: 5
      });
    }

    // === SEÇÃO 6: Novidades ===
    const newest = [...scoredRestaurants]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 10);

    if (newest.length > 0) {
      sections.push({
        id: 'newest',
        title: 'Novidades',
        subtitle: 'Recém chegados na plataforma',
        items: newest,
        priority: 6
      });
    }

    // Se não tem nenhuma seção, mostrar descobertas gerais
    if (sections.length === 0) {
      sections.push({
        id: 'discover',
        title: 'Descubra',
        subtitle: 'Restaurantes para explorar',
        items: scoredRestaurants.slice(0, 20),
        priority: 10
      });
    }

    // Ordenar seções por prioridade
    sections.sort((a, b) => a.priority - b.priority);

    return sections;
  }
};
