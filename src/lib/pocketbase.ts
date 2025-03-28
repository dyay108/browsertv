import PocketBase, { AuthModel } from 'pocketbase';

// Initialize the PocketBase client
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'); 

// Export current user as a convenience
export const getCurrentUser = (): AuthModel | null => pb.authStore.model;

// Check if user is authenticated
export const isAuthenticated = (): boolean => pb.authStore.isValid;