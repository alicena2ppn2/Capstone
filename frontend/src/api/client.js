import { createBackendClient } from './backendClient.mjs';
export const backendClient = createBackendClient({baseUrl:import.meta.env.VITE_API_URL});
