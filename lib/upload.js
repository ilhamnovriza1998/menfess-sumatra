import { supabase } from './supabase.js';

export async function uploadImage(
  buffer,
  filename
) {

  const { data, error } = await supabase
    .storage
    .from('menfess')
    .upload(
      `uploads/${filename}`,
      buffer,
      {
        contentType: 'image/jpeg',
        upsert: false
      }
    );

  if (error) {
    throw error;
  }

  const { data: publicUrl } = supabase
    .storage
    .from('menfess')
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}