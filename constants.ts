import { User, Restaurant, List, Review, Comment } from './types';

// --- UI CONSTANTS ---

export const CUISINE_OPTIONS = [
  'Brasileira', 'Nordestina', 'Baiana', 'Mineira', 'Peruana', 'Mexicana', 
  'Americana', 'Italiana', 'Japonesa', 'Árabe', 'Asiática', 'Chinesa', 
  'Hamburgueria/Lanche', 'Pizzaria', 'Peixes e frutos do mar', 'Carnes', 
  'Vegetariana', 'Vegana', 'Sanduíches', 'Padaria'
];

export const OCCASION_GROUPS = [
  {
    title: 'Social/Vibe Noturna',
    options: ['Cervejinha com amigos', 'Música ao vivo', 'Bons drinks/Coquetelaria', 'Happy Hour', 'Fome na madruga']
  },
  {
    title: 'Trabalho/Negócio',
    options: ['Almoço de negócios', 'Almoço do trabalho', 'Café para trabalhar']
  },
  {
    title: 'Ação do Amor',
    options: ['Bom pra date', 'Comemorar aniversário', 'Levar um gringo']
  },
  {
    title: 'Família/Conforto',
    options: ['Em família', 'Domingão à noite', 'Comida afetiva/caseira', 'Family-friendly']
  },
  {
    title: 'Outras Vibes',
    options: ['Comida/lanche rápido', 'Adoçar a boca', 'Visual foda', 'Brunch', 'Em casa (delivery)']
  }
];

export const RADAR_OPTIONS = {
  frequencies: [
    '1x por mês ou menos', 
    'Algumas vezes por mês', 
    '1x por semana', 
    'Algumas vezes por semana', 
    'Quase todo dia'
  ],
  placeTypes: [
    'Raiz/Comida de verdade',
    'Tradicional/Clássicos',
    'Sofisticado/Alta coquetelaria',
    'Visual foda/Instagramável',
    'Fora do óbvio/Escondido',
    'Hypado/Disputado',
    'Pequeno e intimista',
    'Café rápido/No balcão',
    'Family-friendly'
  ],
  behaviors: [
    'De planejar com antecedência',
    'De decidir em cima da hora',
    'De repetir lugar que gostou',
    'De testar lugares novos'
  ]
};

export const RESTRICTION_OPTIONS = [
  { label: 'Não tenho restrições', type: 'special' },
  { label: 'Vegetariano' },
  { label: 'Vegano' },
  { label: 'Sem lactose' },
  { label: 'Sem glúten' },
  { label: 'Sem frutos do mar' },
  { label: 'Sem amendoim' },
  { label: 'Kosher' },
  { label: 'Halal' }
];

// --- MOCK DATA ---

export const CURRENT_USER: User = {
  id: 'u1',
  full_name: 'Ana Silva',
  username: 'anasilva',
  email: 'ana@example.com',
  profile_photo_url: 'https://picsum.photos/seed/ana/200/200',
  bio: 'Exploradora de sabores e cafés aconchegantes. ☕✨',
  city: 'São Paulo',
  neighborhood: 'Pinheiros',
  reviews_count: 12,
  followers_count: 128,
  following_count: 45,
  is_verified: true
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  {
    id: 'u2',
    full_name: 'Carlos Oliveira',
    username: 'carlos_o',
    email: 'carlos@example.com',
    profile_photo_url: 'https://picsum.photos/seed/carlos/200/200',
    bio: 'Chef amador e crítico de botecos.',
    city: 'Rio de Janeiro',
    reviews_count: 34,
    followers_count: 890,
    following_count: 120
  },
  {
    id: 'u3',
    full_name: 'Mariana Costa',
    username: 'maricosta',
    email: 'mari@example.com',
    profile_photo_url: 'https://picsum.photos/seed/mari/200/200',
    bio: 'Vegana em busca do prato perfeito.',
    city: 'São Paulo',
    neighborhood: 'Vila Madalena',
    reviews_count: 8,
    followers_count: 56,
    following_count: 200
  }
];

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: 'Cantina da Nona',
    address: 'Rua dos Pinheiros, 123',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    photo_url: 'https://picsum.photos/seed/rest1/400/300',
    cuisine_types: ['Italiana'],
    type: 'Italiana',
    price_level: 2,
    rating: 4.8,
    reviews_count: 120,
    coords: { x: 30, y: 40 },
    occasions: ['Família', 'Date'],
    description: 'Tradicional cantina italiana com massas artesanais.'
  },
  {
    id: 'r2',
    name: 'Sushi Omakase',
    address: 'Av. Paulista, 900',
    city: 'São Paulo',
    neighborhood: 'Bela Vista',
    photo_url: 'https://picsum.photos/seed/rest2/400/300',
    cuisine_types: ['Japonesa'],
    type: 'Japonesa',
    price_level: 4,
    rating: 4.9,
    reviews_count: 85,
    coords: { x: 60, y: 20 },
    occasions: ['Date', 'Negócios'],
    description: 'Experiência exclusiva de omakase no balcão.'
  },
  {
    id: 'r3',
    name: 'Burger Joint',
    address: 'Rua Augusta, 500',
    city: 'São Paulo',
    neighborhood: 'Consolação',
    photo_url: 'https://picsum.photos/seed/rest3/400/300',
    cuisine_types: ['Hamburgueria'],
    type: 'Hamburgueria',
    price_level: 1,
    rating: 4.5,
    reviews_count: 340,
    coords: { x: 45, y: 70 },
    occasions: ['Rápido', 'Amigos'],
    description: 'Hambúrgueres smash autênticos e batatas crocantes.'
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rv1',
    user_id: 'u2',
    user: MOCK_USERS[1],
    restaurant_id: 'r1',
    restaurant: MOCK_RESTAURANTS[0],
    title: 'Massa incrível',
    description: 'A carbonara é simplesmente divina, autêntica sem creme de leite!',
    review_type: 'in_person',
    average_score: 4.8,
    photos: [{ url: 'https://picsum.photos/seed/pasta/400/500', order: 1 }],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    likes_count: 15,
    comments_count: 2,
    is_liked: false,
    is_saved: true
  },
  {
    id: 'rv2',
    user_id: 'u3',
    user: MOCK_USERS[2],
    restaurant_id: 'r3',
    restaurant: MOCK_RESTAURANTS[2],
    title: 'Ótima opção veg',
    description: 'O burger de falafel é muito saboroso e não desmancha.',
    review_type: 'delivery',
    average_score: 4.5,
    photos: [{ url: 'https://picsum.photos/seed/burger/400/500', order: 1 }],
    created_at: new Date(Date.now() - 172800000).toISOString(),
    likes_count: 24,
    comments_count: 5,
    is_liked: true,
    is_saved: false
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    user_id: 'u1',
    user: CURRENT_USER,
    review_id: 'rv1',
    content: 'Preciso provar!',
    created_at: new Date().toISOString()
  }
];

export const MOCK_LISTS: List[] = [
  {
    id: 'l0',
    user_id: 'u1',
    name: 'Já foi',
    is_private: true,
    is_default: true,
    count: 45,
    cover_photo_url: 'https://picsum.photos/seed/food1/400/300',
    items: ['r1', 'r2']
  },
  {
    id: 'l1',
    user_id: 'u1',
    name: 'Quero ir',
    is_private: false,
    is_default: true,
    count: 12,
    cover_photo_url: 'https://picsum.photos/seed/food2/400/300',
    items: ['r3']
  },
  {
    id: 'l2',
    user_id: 'u1',
    name: 'Melhores Burgers',
    is_private: false,
    is_default: false,
    count: 5,
    cover_photo_url: 'https://picsum.photos/seed/burger/400/300',
    items: ['r3']
  }
];