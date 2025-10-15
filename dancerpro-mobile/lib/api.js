import { buildApiEndpoint, fetchWithTimeout, getAuthToken } from './http';

/**
 * Fetch cloud snapshot from backend
 * @returns {Promise<Object>} Snapshot data with metadata
 */
export async function fetchCloudSnapshot() {
  try {
    // Get auth token from storage
    const authToken = await getAuthToken();

    if (!authToken) {
      throw new Error('No authentication token found');
    }

    // Construct endpoint URL
    const syncEndpoint = buildApiEndpoint('sync/import');

    const response = await fetchWithTimeout(syncEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }, 15000);

    if (response.status === 404) {
      // No cloud snapshot exists yet - this is normal for new users
      console.log('No cloud snapshot found - user may not have saved data yet');
      return {
        success: true,
        snapshot: {},
        metadata: {
          updatedAt: null,
          version: 0
        }
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching cloud snapshot:', error);
    throw error;
  }
}

export default { fetchCloudSnapshot };