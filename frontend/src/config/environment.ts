/**
 * Environment Configuration
 *
 * Centralized configuration for environment-specific settings.
 * Supports development, staging, and production environments.
 */

interface EnvironmentConfig {
  websocketUrl: string;
  apiUrl: string;
  matchApiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  enableDebugLogs: boolean;
}

/**
 * Get environment configuration based on current environment
 */
function getEnvironmentConfig(): EnvironmentConfig {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  // WebSocket URL from environment variable or default
  const websocketUrl =
    import.meta.env.VITE_WEBSOCKET_URL ||
    (isDevelopment
      ? 'ws://localhost:3001' // Local development WebSocket server
      : 'wss://api.pulseparty.example.com'); // Production WebSocket API Gateway

  // REST API URL from environment variable or default
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    (isDevelopment
      ? 'http://localhost:3001' // Local development API
      : 'https://api.pulseparty.example.com'); // Production API Gateway

  // Match API URL from environment variable or default
  const matchApiUrl =
    import.meta.env.VITE_MATCH_API_URL ||
    `${apiUrl}/matches`; // Default to apiUrl + /matches

  return {
    websocketUrl,
    apiUrl,
    matchApiUrl,
    isDevelopment,
    isProduction,
    enableDebugLogs: isDevelopment,
  };
}

export const config = getEnvironmentConfig();

/**
 * Log configuration on startup (development only)
 */
if (config.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    websocketUrl: config.websocketUrl,
    apiUrl: config.apiUrl,
    matchApiUrl: config.matchApiUrl,
    isDevelopment: config.isDevelopment,
    isProduction: config.isProduction,
  });
}
