import { pb } from '../lib/pocketbase';
import { Channel } from '../types/pocketbase-types';
import { channelService } from './channelService';
import { groupService } from './groupService';
import { coreService } from './core';

interface M3UChannelInfo {
  name: string;
  tvgId?: string;
  tvgName?: string;
  logo: string;
  group: string;
  playlist: string;
}

interface ChannelGroupAssociation {
  channelId: string;
  groupNames: string[];
}

export async function parseM3UContent(content: string, playlistId: string): Promise<number> {
  const channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[] = [];
  const groupNames = new Set<string>();
  const channelGroups: ChannelGroupAssociation[] = [];

  await processM3UContent(content, playlistId, channels, groupNames, channelGroups);
  await saveM3UData(playlistId, channels, groupNames, channelGroups);

  return channels.length;
}

async function processM3UContent(
  content: string, 
  playlistId: string,
  channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[],
  groupNames: Set<string>,
  channelGroups: ChannelGroupAssociation[]
) {
  const lines = content.split(/\r?\n/);
  let channelInfo: Partial<M3UChannelInfo> | null = null;
  let currentGroup = '';
  let currentGroups: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '#EXTM3U') continue;

    if (line.startsWith('#EXTGRP:')) {
      currentGroup = line.substring(8).trim();
      if (currentGroup) {
        groupNames.add(currentGroup);
        currentGroups = [currentGroup];
      }
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const channelData = parseExtInf(line, currentGroup);
      channelInfo = { ...channelData, playlist: playlistId };
      currentGroups = channelData.groups;
      
      for (const group of currentGroups) {
        groupNames.add(group);
      }
    } 
    else if (channelInfo && !line.startsWith('#') && line.trim()) {
      const url = line.trim();
      const id = extractIdFromUrl(url);

      const channel = {
        name: channelInfo.name,
        url,
        logo: channelInfo.logo || '',
        group: channelInfo.group,
        tvgId: channelInfo.tvgId || '',
        tvgName: channelInfo.tvgName || '',
        playlist: playlistId
      };

      channels.push(channel);

      if (currentGroups.length > 0) {
        channelGroups.push({
          channelId: id,
          groupNames: [...currentGroups]
        });
      }

      channelInfo = null;
    }
  }
}

function parseExtInf(line: string, currentGroup: string): { 
  name: string, 
  tvgId?: string, 
  tvgName?: string, 
  logo: string, 
  group: string,
  groups: string[]
} {
  const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
  const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
  const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
  const groupMatch = line.match(/group-title="([^"]*)"/i);

  const lastCommaIndex = line.lastIndexOf(',');
  const name = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : '';

  let primaryGroup = 'Ungrouped';
  let groups: string[] = [];

  if (groupMatch && groupMatch[1]) {
    groups = groupMatch[1].split(';')
      .map(g => g.trim())
      .filter(g => g.length > 0);

    if (groups.length > 0) {
      primaryGroup = groups[0];
    }
  } else if (currentGroup) {
    primaryGroup = currentGroup;
    groups = [currentGroup];
  }

  return {
    name,
    tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
    tvgName: tvgNameMatch ? tvgNameMatch[1] : '',
    logo: logoMatch ? logoMatch[1] : '',
    group: primaryGroup,
    groups
  };
}

async function saveM3UData(
  playlistId: string,
  channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[],
  groupNames: Set<string>,
  channelGroups: ChannelGroupAssociation[]
) {
  // Clear existing channels
  const existingChannels = await coreService.getFullList<Channel>('channels', `playlist="${playlistId}"`);
  for (const channel of existingChannels) {
    await pb.collection('channels').delete(channel.id);
  }

  // Create groups and map names to IDs
  const groupMap = new Map<string, string>();
  for (const groupName of groupNames) {
    try {
      const group = await groupService.createGroup(groupName, playlistId);
      groupMap.set(groupName, group.id);
    } catch (error) {
      console.error(`Error creating group ${groupName}:`, error);
    }
  }

  // Save group order
  await groupService.saveGroupOrder(Array.from(groupNames), playlistId);

  // Create channels with their group associations
  for (const channel of channels) {
    try {
      const savedChannel = await channelService.createChannel(channel);
      const association = channelGroups.find(
        cg => cg.channelId === extractIdFromUrl(channel.url)
      );
      
      if (association) {
        for (const groupName of association.groupNames) {
          const groupId = groupMap.get(groupName);
          if (groupId) {
            await pb.collection('channel_groups').create({
              channel: savedChannel.id,
              group: groupId
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error creating channel ${channel.name}:`, error);
    }
  }
}

// Helper function to extract ID from URL
export function extractIdFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts.join('/');
    }
  } catch (e) {
    console.warn(`Failed to parse URL for ID extraction: ${url}`);
  }
  return url;
}