import { IChannel } from '../db';

/**
 * Parses M3U file content into an array of channel objects
 * 
 * @param content The M3U file content as a string
 * @param playlistId The ID of the playlist these channels belong to
 * @returns Array of parsed channel objects
 */
export function parseM3U(content: string, playlistId?: number): IChannel[] {
  const lines = content.split(/\r?\n/);
  const parsedChannels: IChannel[] = [];

  let currentGroup = '';
  let channelInfo: Partial<IChannel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse group
    if (line.startsWith('#EXTGRP:')) {
      currentGroup = line.substring(8).trim();
      continue;
    }

    // Parse channel info
    if (line.startsWith('#EXTINF:')) {
      const infoLine = line.substring(8);

      // Extract name from end of line (after the last comma)
      const nameMatch = infoLine.match(/,(.*)$/);
      const name = nameMatch ? nameMatch[1].trim() : '';

      // Extract properties (tvg-logo, group-title, etc)
      const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
      const logo = logoMatch ? logoMatch[1] : '';

      const groupMatch = infoLine.match(/group-title="([^"]*)"/);
      const group = groupMatch ? groupMatch[1] : currentGroup;

      channelInfo = {
        name,
        logo,
        group,
        id: `channel-${parsedChannels.length}`,
        playlistId: playlistId || 1
      };

      continue;
    }

    // Parse URL (non-comment lines after channel info)
    if (line && !line.startsWith('#') && channelInfo.name) {
      parsedChannels.push({
        ...channelInfo as IChannel,
        url: line
      });
      channelInfo = {};
    }
  }

  return parsedChannels;
}

/**
 * Extracts unique groups from a list of channels
 * 
 * @param channels Array of channel objects
 * @returns Array of unique group names
 */
export function extractGroups(channels: IChannel[]): string[] {
  const uniqueGroups = new Set<string>();
  const orderedGroups: string[] = [];

  // Preserve the original order from the M3U file
  channels.forEach(channel => {
    if (channel.group && !uniqueGroups.has(channel.group)) {
      uniqueGroups.add(channel.group);
      orderedGroups.push(channel.group);
    }
  });

  return orderedGroups;
}

/**
 * Prepares a URL with CORS proxy if needed
 * 
 * @param proxyUrl The CORS proxy URL
 * @param targetUrl The target URL to proxy
 * @returns The prepared URL with proxy if applicable
 */
export function prepareProxyUrl(proxyUrl: string, targetUrl: string): string {
  // Handle different proxy URL formats
  if (proxyUrl.includes('?url=')) {
    // For proxies that use ?url= format (like allorigins)
    return `${proxyUrl}${encodeURIComponent(targetUrl)}`;
  } else {
    // For direct proxies (like cors-anywhere)
    return `${proxyUrl}${targetUrl}`;
  }
}