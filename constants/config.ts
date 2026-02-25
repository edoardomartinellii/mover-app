/**
 * Mapbox Configuration
 *
 * Replace with your own Mapbox public access token.
 * Get one at: https://account.mapbox.com/access-tokens/
 * Set MAPBOX_ACCESS_TOKEN in your .env file (never commit the real token).
 */
export const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? '';
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/light-v11';

export const DEFAULT_LATITUDE = 43.8696;
export const DEFAULT_LONGITUDE = 10.2470;
export const DEFAULT_ZOOM = 14;
