import { SupabaseClient } from '@supabase/supabase-js';

export const StorageService = {
  async uploadReviewPhoto(
    supabase: SupabaseClient,
    userId: string,
    reviewId: string,
    file: File,
    index: number
  ): Promise<string | null> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${reviewId}_${index + 1}.${fileExt}`;

    const { error } = await supabase.storage
      .from('review-photos')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('review-photos')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  },

  async uploadReviewPhotos(
    supabase: SupabaseClient,
    userId: string,
    reviewId: string,
    files: File[]
  ): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const url = await this.uploadReviewPhoto(supabase, userId, reviewId, files[i], i);
      if (url) uploadedUrls.push(url);
    }

    return uploadedUrls;
  },

  async uploadProfilePhoto(
    supabase: SupabaseClient,
    userId: string,
    file: File
  ): Promise<string | null> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/profile.${fileExt}`;

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading profile photo:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  },

  async uploadListCover(
    supabase: SupabaseClient,
    userId: string,
    listId: string,
    file: File
  ): Promise<string | null> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${listId}_cover.${fileExt}`;

    const { error } = await supabase.storage
      .from('list-covers')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading list cover:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('list-covers')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  },

  async deleteFile(supabase: SupabaseClient, bucket: string, path: string) {
    return supabase.storage.from(bucket).remove([path]);
  }
};