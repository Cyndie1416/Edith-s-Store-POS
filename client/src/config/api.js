// API Configuration
const API_CONFIG = {
  // Development
  development: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    httpsURL: 'https://localhost:5001'
  },
  // Production
  production: {
    baseURL: process.env.REACT_APP_API_URL || 'https://yourdomain.com',
    httpsURL: process.env.REACT_APP_API_URL || 'https://yourdomain.com'
  }
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';
const config = API_CONFIG[environment];

// Function to get the appropriate API URL
export const getApiUrl = (useHttps = false) => {
  // Check if we're accessing from external IP (not localhost)
  const isExternalAccess = window.location.hostname !== 'localhost' && 
                          window.location.hostname !== '127.0.0.1';
  
  // If external access and HTTPS is requested, use HTTPS
  if (isExternalAccess && useHttps) {
    return config.httpsURL;
  }
  
  // Otherwise use the default base URL
  return config.baseURL;
};

// Default export for backward compatibility
export default config.baseURL;
