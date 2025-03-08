import { RecordModel } from 'pocketbase';

// PocketBase User Type
export interface User extends RecordModel {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created: string;
  updated: string;
}

// Playlist Type
export interface Playlist extends RecordModel {
  name: string;
  lastUsed: string;
  url?: string;
  user: string; // Reference to user ID
}

// Channel Type
export interface Channel extends RecordModel {
  name: string;
  url: string;
  logo: string;
  group: string;
  tvgId?: string;
  tvgName?: string;
  playlist: string; // Reference to playlist ID
}

// Group Type
export interface Group extends RecordModel {
  name: string;
  playlist: string; // Reference to playlist ID
}

// Channel Group Junction Type
export interface ChannelGroup extends RecordModel {
  channel: string; // Reference to channel ID
  group: string;   // Reference to group ID
}

// Favorite Type
export interface Favorite extends RecordModel {
  channel: string; // Reference to channel ID
  playlist: string; // Reference to playlist ID
  user: string;    // Reference to user ID
}

// Group Order Type
export interface GroupOrder extends RecordModel {
  groups: string[];
  playlist: string; // Reference to playlist ID
}