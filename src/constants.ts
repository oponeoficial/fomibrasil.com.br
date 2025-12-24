// --- UI CONSTANTS COM ÍCONES ---

export const CUISINE_OPTIONS = [
  { label: 'Brasileira', icon: 'flag' },
  { label: 'Nordestina', icon: 'sunny' },
  { label: 'Baiana', icon: 'local_fire_department' },
  { label: 'Mineira', icon: 'cottage' },
  { label: 'Peruana', icon: 'landscape' },
  { label: 'Mexicana', icon: 'whatshot' },
  { label: 'Americana', icon: 'fastfood' },
  { label: 'Italiana', icon: 'local_pizza' },
  { label: 'Japonesa', icon: 'set_meal' },
  { label: 'Árabe', icon: 'kebab_dining' },
  { label: 'Asiática', icon: 'rice_bowl' },
  { label: 'Chinesa', icon: 'ramen_dining' },
  { label: 'Hamburgueria/Lanche', icon: 'lunch_dining' },
  { label: 'Pizzaria', icon: 'local_pizza' },
  { label: 'Peixes e frutos do mar', icon: 'phishing' },
  { label: 'Carnes', icon: 'outdoor_grill' },
  { label: 'Vegetariana', icon: 'eco' },
  { label: 'Vegana', icon: 'spa' },
  { label: 'Sanduíches', icon: 'bakery_dining' },
  { label: 'Padaria', icon: 'cake' }
];

export const OCCASION_GROUPS = [
  {
    title: 'Social/Vibe Noturna',
    icon: 'nightlife',
    options: [
      { label: 'Cervejinha com amigos', icon: 'sports_bar' },
      { label: 'Música ao vivo', icon: 'music_note' },
      { label: 'Bons drinks/Coquetelaria', icon: 'local_bar' },
      { label: 'Happy Hour', icon: 'celebration' },
      { label: 'Fome na madruga', icon: 'dark_mode' }
    ]
  },
  {
    title: 'Trabalho/Negócio',
    icon: 'work',
    options: [
      { label: 'Almoço de negócios', icon: 'business_center' },
      { label: 'Almoço do trabalho', icon: 'badge' },
      { label: 'Café para trabalhar', icon: 'laptop_mac' }
    ]
  },
  {
    title: 'Ação do Amor',
    icon: 'favorite',
    options: [
      { label: 'Bom pra date', icon: 'favorite' },
      { label: 'Comemorar aniversário', icon: 'cake' },
      { label: 'Jantar de noivado', icon: 'diamond' },
      { label: 'Confraternização', icon: 'groups' },
      { label: 'Levar um gringo', icon: 'language' }
    ]
  },
  {
    title: 'Família/Conforto',
    icon: 'family_restroom',
    options: [
      { label: 'Em família', icon: 'family_restroom' },
      { label: 'Domingão à noite', icon: 'weekend' },
      { label: 'Comida afetiva/caseira', icon: 'home' },
      { label: 'Family-friendly', icon: 'child_care' }
    ]
  },
  {
    title: 'Outras Vibes',
    icon: 'auto_awesome',
    options: [
      { label: 'Comida/lanche rápido', icon: 'bolt' },
      { label: 'Adoçar a boca', icon: 'icecream' },
      { label: 'Brunch', icon: 'brunch_dining' },
      { label: 'Em casa (delivery)', icon: 'delivery_dining' }
    ]
  }
];

export const RADAR_OPTIONS = {
  frequencies: [
    { label: '1x por mês ou menos', icon: 'event' },
    { label: 'Algumas vezes por mês', icon: 'date_range' },
    { label: '1x por semana', icon: 'calendar_today' },
    { label: 'Algumas vezes por semana', icon: 'calendar_month' },
    { label: 'Quase todo dia', icon: 'today' }
  ],
  placeTypes: [
    { label: 'Raiz/Comida de verdade', icon: 'restaurant' },
    { label: 'Tradicional/Clássicos', icon: 'auto_awesome' },
    { label: 'Sofisticado/Alta coquetelaria', icon: 'wine_bar' },
    { label: 'Fora do óbvio/Escondido', icon: 'explore' },
    { label: 'Hypado/Disputado', icon: 'whatshot' },
    { label: 'Pequeno e intimista', icon: 'brightness_low' },
    { label: 'Café rápido/No balcão', icon: 'coffee' },
    { label: 'Sorvetes/Doces', icon: 'icecream' },
    { label: 'Family-friendly', icon: 'family_restroom' }
  ],
  behaviors: [
    { label: 'De planejar com antecedência', icon: 'event_available' },
    { label: 'De decidir em cima da hora', icon: 'bolt' },
    { label: 'De repetir lugar que gostou', icon: 'replay' },
    { label: 'De testar lugares novos', icon: 'explore' }
  ]
};

export const RESTRICTION_OPTIONS = [
  { label: 'Não tenho restrições', icon: 'check_circle', type: 'special' },
  { label: 'Vegetariano', icon: 'eco' },
  { label: 'Vegano', icon: 'spa' },
  { label: 'Sem lactose', icon: 'water_drop' },
  { label: 'Sem glúten', icon: 'grain' },
  { label: 'Sem frutos do mar', icon: 'set_meal' },
  { label: 'Sem amendoim', icon: 'nutrition' },
  { label: 'Kosher', icon: 'verified' },
  { label: 'Halal', icon: 'mosque' }
];

// Placeholder para imagens faltantes
export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=E63946&color=fff&name=User';
export const DEFAULT_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';
export const DEFAULT_RESTAURANT = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop';