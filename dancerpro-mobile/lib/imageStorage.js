import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Derive a reasonable file extension from MIME or URI
function getExtension(mime = '', uri = '') {
  const fromMime = mime.split('/')[1] || '';
  const ext = (fromMime || '')
    .replace('jpeg', 'jpg')
    .replace('heic', 'heic')
    .replace('png', 'png');
  if (ext) return ext;
  const uriExt = uri.split('?')[0].split('#')[0].split('.').pop();
  return uriExt || 'jpg';
}

// Convert a Blob to a data URL (web only)
async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Persist an image asset cross-platform and return a stable photo object.
 * - Web: stores as data URL for robust localStorage persistence.
 * - Native: copies to app documentDirectory for stable file path.
 */
export async function persistImageAsync(asset) {
  try {
    const id = `img_${Date.now()}`;
    const mime = asset?.type || 'image/jpeg';
    const ext = getExtension(mime, asset?.uri || '');

    if (Platform.OS === 'web') {
      // Prefer base64 from ImagePicker, fallback to fetch->blob conversion
      let dataUrl;
      if (asset?.base64) {
        dataUrl = `data:${mime};base64,${asset.base64}`;
      } else if (asset?.uri) {
        const resp = await fetch(asset.uri);
        const blob = await resp.blob();
        dataUrl = await blobToDataUrl(blob);
      } else {
        throw new Error('No asset URI or base64 available for web persistence');
      }

      return { id, uri: dataUrl, storage: 'dataUrl', mime, ext };
    }

    // Native (iOS/Android): persist file into app sandbox
    const dir = FileSystem.documentDirectory + 'outfits/';
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {}
    const dest = `${dir}${id}.${ext}`;
    const from = asset?.uri;
    if (!from) throw new Error('Missing asset URI for native persistence');
    await FileSystem.copyAsync({ from, to: dest });
    return { id, uri: dest, storage: 'file', mime, ext };
  } catch (e) {
    console.warn('[imageStorage] persistImageAsync failed:', e);
    // Fallback to raw URI to avoid blocking user flow
    return {
      id: `img_${Date.now()}`,
      uri: asset?.uri || '',
      storage: Platform.OS === 'web' ? 'unknown-web' : 'unknown-native',
      mime: asset?.type || 'image/jpeg',
      ext: getExtension(asset?.type, asset?.uri || '')
    };
  }
}

/**
 * Remove a previously persisted photo.
 * - Web: no-op (data URLs are stored inline in localStorage with outfit)
 * - Native: deletes the file from sandbox if storage is 'file'
 */
export async function removeImageAsync(photo) {
  try {
    if (!photo) return;
    if (Platform.OS !== 'web' && photo.storage === 'file' && photo.uri) {
      await FileSystem.deleteAsync(photo.uri, { idempotent: true });
    }
  } catch (e) {
    console.warn('[imageStorage] removeImageAsync failed:', e);
  }
}

export default { persistImageAsync, removeImageAsync };