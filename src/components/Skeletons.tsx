import React from 'react';

// Base skeleton com animação
const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

// Skeleton circular (avatar)
export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  return <SkeletonBase className={`${sizes[size]} rounded-full`} />;
};

// Skeleton texto (linha)
export const SkeletonText: React.FC<{ width?: string; height?: string }> = ({ 
  width = 'w-full', 
  height = 'h-4' 
}) => (
  <SkeletonBase className={`${width} ${height} rounded-full`} />
);

// Skeleton imagem/card
export const SkeletonBox: React.FC<{ className?: string }> = ({ className = 'w-full h-40' }) => (
  <SkeletonBase className={`${className} rounded-2xl`} />
);

// Skeleton de Review Card (Feed)
export const SkeletonReviewCard: React.FC = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
    {/* Header */}
    <div className="flex items-center gap-3 mb-3">
      <SkeletonAvatar size="lg" />
      <div className="flex-1 space-y-2">
        <SkeletonText width="w-32" />
        <SkeletonText width="w-24" height="h-3" />
      </div>
    </div>
    
    {/* Image */}
    <SkeletonBox className="w-full h-48 mb-3" />
    
    {/* Content */}
    <div className="space-y-2 mb-3">
      <SkeletonText width="w-3/4" />
      <SkeletonText width="w-full" />
      <SkeletonText width="w-1/2" />
    </div>
    
    {/* Actions */}
    <div className="flex gap-4 pt-2">
      <SkeletonText width="w-16" />
      <SkeletonText width="w-16" />
      <SkeletonText width="w-16" />
    </div>
  </div>
);

// Skeleton de Profile Header
export const SkeletonProfileHeader: React.FC = () => (
  <div className="flex flex-col items-center py-6">
    <SkeletonAvatar size="xl" />
    <div className="mt-4 space-y-2 flex flex-col items-center">
      <SkeletonText width="w-32" height="h-5" />
      <SkeletonText width="w-24" height="h-3" />
    </div>
    <div className="flex gap-8 mt-4">
      <div className="flex flex-col items-center gap-1">
        <SkeletonText width="w-8" height="h-5" />
        <SkeletonText width="w-16" height="h-3" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <SkeletonText width="w-8" height="h-5" />
        <SkeletonText width="w-16" height="h-3" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <SkeletonText width="w-8" height="h-5" />
        <SkeletonText width="w-16" height="h-3" />
      </div>
    </div>
  </div>
);

// Skeleton de Restaurant Card
export const SkeletonRestaurantCard: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    <SkeletonBox className="w-full h-32" />
    <div className="p-3 space-y-2">
      <SkeletonText width="w-3/4" height="h-4" />
      <SkeletonText width="w-1/2" height="h-3" />
      <div className="flex gap-2 pt-1">
        <SkeletonText width="w-12" height="h-5" />
        <SkeletonText width="w-16" height="h-5" />
      </div>
    </div>
  </div>
);

// Skeleton de List Card
export const SkeletonListCard: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    <SkeletonBox className="w-full h-24" />
    <div className="p-3 space-y-2">
      <SkeletonText width="w-2/3" height="h-4" />
      <SkeletonText width="w-1/3" height="h-3" />
    </div>
  </div>
);

// Skeleton de Notification Item
export const SkeletonNotification: React.FC = () => (
  <div className="flex items-center gap-3 p-4 border-b border-gray-100">
    <SkeletonAvatar size="md" />
    <div className="flex-1 space-y-2">
      <SkeletonText width="w-3/4" />
      <SkeletonText width="w-1/2" height="h-3" />
    </div>
    <SkeletonBox className="w-10 h-10" />
  </div>
);

// Skeleton de Comment
export const SkeletonComment: React.FC = () => (
  <div className="flex gap-3 py-3">
    <SkeletonAvatar size="sm" />
    <div className="flex-1 space-y-2">
      <SkeletonText width="w-24" height="h-3" />
      <SkeletonText width="w-full" />
      <SkeletonText width="w-2/3" />
    </div>
  </div>
);

// Feed Skeleton (múltiplos cards)
export const SkeletonFeed: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonReviewCard key={i} />
    ))}
  </div>
);

// Grid de Restaurants
export const SkeletonRestaurantGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 gap-3 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRestaurantCard key={i} />
    ))}
  </div>
);

// Lista de Notifications
export const SkeletonNotificationList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonNotification key={i} />
    ))}
  </div>
);

// Lista de Comments
export const SkeletonCommentList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="divide-y divide-gray-100">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonComment key={i} />
    ))}
  </div>
);