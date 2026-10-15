import { createBackendClient } from '../../../shared/api/backendClient.mjs';
export const backendClient = createBackendClient({baseUrl:import.meta.env.VITE_API_URL});
