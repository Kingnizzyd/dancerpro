import { BACKEND_URL } from './config';

/**
 * Fetch cloud snapshot from backend
 * @returns {Promise<Object>} Snapshot data with metadata
 */
export async function fetchCloudSnapshot() {
  try {
    // Get auth token from localStorage (web) or secure storage (mobile)
    let authToken;
    if (typeof window !== 'undefined') {
      authToken = localStorage.getItem('authToken');
    } else {
      // For mobile, you'd use secure storage here
      const { secureGet } = require('./secureStorage');
      authToken = await secureGet('authToken');
    }

    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${BACKEND_URL}/sync-import`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

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