import { createBackendClient } from '../../../shared/api/backendClient.mjs';
// Same public environment name as backend/FRONTEND_GUIDE.md; never defaults to a guessed address.
export const backendClient = createBackendClient({baseUrl:process.env.EXPO_PUBLIC_API_URL});
