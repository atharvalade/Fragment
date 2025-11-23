/**
 * API Configuration
 * Change the backend URL in ONE place
 */

export const API_BASE_URL = 'https://loose-under-prototype-pin.trycloudflare.com';

// Helper function to build API URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};

