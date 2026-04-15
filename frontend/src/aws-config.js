export const COG_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID
export const COG_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID
export const REGION = COG_USER_POOL_ID?.split('_')[0] ?? 'us-east-1';
export const COGNITO_URL = `https://cognito-idp.${REGION}.amazonaws.com/`