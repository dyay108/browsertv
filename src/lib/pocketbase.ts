import PocketBase, { AuthModel } from 'pocketbase';

// Initialize the PocketBase client
export const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

// Export current user as a convenience
export const getCurrentUser = (): AuthModel | null => pb.authStore.model;

// Check if user is authenticated
export const isAuthenticated = (): boolean => pb.authStore.isValid;