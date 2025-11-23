/**
 * API Configuration
 * Change the backend URL in ONE place
 */

export const API_BASE_URL = 'http://localhost:3001';

// Helper function to build API URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};

