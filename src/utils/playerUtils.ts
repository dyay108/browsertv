import videojs from 'video.js';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';

export enum PlaybackMethod {
  VideoJS = 'videojs',
  HLS = 'hls.js',
  MPEGTS = 'mpegts.js',
  NATIVE = 'native'
}

// Determine stream type based on URL
export const getStreamType = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('playlist.m3u')) {
    return 'hls';
  } else if (lowerUrl.includes('.ts') || lowerUrl.includes('mpeg')) {
    return 'mpegts';
  } else if (lowerUrl.includes('.mp4')) {
    return 'mp4';
  } else if (lowerUrl.includes('rtmp://')) {
    return 'rtmp';
  } else {
    // For IPTV, default to trying mpegts first
    return 'mpegts';
  }
};

// Get recommended methods order based on stream type
export const getMethodsForStreamType = (streamType: string): string[] => {
  if (streamType === 'hls') {
    return ['hls', 'videojs', 'mpegts', 'native'];
  } else if (streamType === 'mpegts') {
    return ['mpegts', 'videojs', 'hls', 'native'];
  } else {
    return ['native', 'videojs', 'hls', 'mpegts'];
  }
};

// Create a standardized video element
export const createVideoElement = (id: string, className: string): HTMLVideoElement => {
  const video = document.createElement('video');
  video.id = id;
  video.className = className;
  video.controls = true;
  video.autoplay = true;
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.position = 'absolute';
  video.style.top = '0';
  video.style.left = '0';
  video.style.right = '0';
  video.style.bottom = '0';
  video.style.margin = 'auto';
  video.style.maxWidth = '100%';
  video.style.maxHeight = '100%';
  video.style.objectFit = 'contain';
  return video;
};

// Initialize VideoJS
export const initVideoJs = (
  container: HTMLDivElement, 
  src: string, 
  streamType: string, 
  onSuccess: (method: PlaybackMethod) => void,
  onError: (error: any) => void
) => {
  // Create video element with videojs class
  const video = document.createElement('video');
  video.className = 'video-js vjs-big-play-centered';
  video.controls = true;
  video.autoplay = true;
  
  // Clear container and add video element
  container.innerHTML = '';
  container.appendChild(video);
  
  try {
    // Initialize videojs
    const player = videojs(video, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      fluid: true,
      sources: [{
        src: src,
        type: streamType === 'hls' ? 'application/x-mpegURL' : 
              streamType === 'mpegts' ? 'video/MP2T' : 
              'video/mp4'
      }],
      html5: {
        hls: { overrideNative: true },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      }
    });
    
    // Set success handler
    onSuccess(PlaybackMethod.VideoJS);
    
    // Error handling
    player.on('error', (e: any) => {
      console.error('VideoJS error:', e);
      onError(e);
    });
    
    return { player, videoElement: video };
  } catch (e) {
    console.error('Error initializing VideoJS:', e);
    onError(e);
    return { player: null, videoElement: video };
  }
};

// Initialize HLS.js
export const initHls = (
  container: HTMLDivElement, 
  src: string, 
  onSuccess: (method: PlaybackMethod) => void,
  onError: (error: any) => void
) => {
  // Create fresh video element
  const video = createVideoElement('hls-player-' + Date.now(), 'video-player hls-player');
  
  // Clear container and add video element
  container.innerHTML = '';
  container.appendChild(video);
  
  if (!Hls.isSupported()) {
    console.log('HLS.js not supported');
    onError(new Error('HLS.js not supported'));
    return { hls: null, videoElement: video };
  }
  
  try {
    // Create HLS instance
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      fragLoadingMaxRetry: 5
    });
    
    hls.loadSource(src);
    hls.attachMedia(video);
    
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => {
        console.error('HLS play failed:', e);
      });
    });
    
    // Set success handler
    onSuccess(PlaybackMethod.HLS);
    
    // Error handling
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        console.error('HLS.js fatal error:', data);
        onError(data);
      }
    });
    
    return { hls, videoElement: video };
  } catch (e) {
    console.error('Error initializing HLS.js:', e);
    onError(e);
    return { hls: null, videoElement: video };
  }
};

// Initialize mpegts.js
export const initMpegts = (
  container: HTMLDivElement, 
  src: string, 
  onSuccess: (method: PlaybackMethod) => void,
  onError: (error: any) => void
) => {
  // Create fresh video element
  const video = createVideoElement('mpegts-player-' + Date.now(), 'video-player mpegts-player');
  
  // Clear container and add video element
  container.innerHTML = '';
  container.appendChild(video);
  
  if (!mpegts.isSupported()) {
    console.log('mpegts.js not supported');
    onError(new Error('mpegts.js not supported'));
    return { player: null, videoElement: video };
  }
  
  try {
    // Create mpegts.js player
    const player = mpegts.createPlayer({
      type: 'mpegts',
      url: src,
      isLive: true,
      cors: true
    });
    
    player.attachMediaElement(video);
    player.load();
    
    video.play().catch(e => {
      console.error('mpegts.js play failed:', e);
    });
    
    // Set success handler
    onSuccess(PlaybackMethod.MPEGTS);
    
    // Error handling
    player.on(mpegts.Events.ERROR, (err) => {
      console.error('mpegts.js error:', err);
      onError(err);
    });
    
    return { player, videoElement: video };
  } catch (e) {
    console.error('Error initializing mpegts.js:', e);
    onError(e);
    return { player: null, videoElement: video };
  }
};

// Initialize native video
export const initNative = (
  container: HTMLDivElement, 
  src: string, 
  onSuccess: (method: PlaybackMethod) => void,
  onError: (error: any) => void
) => {
  // Create fresh video element
  const video = createVideoElement('native-player-' + Date.now(), 'video-player native-player');
  
  // Clear container and add video element
  container.innerHTML = '';
  container.appendChild(video);
  
  try {
    // Set source directly
    video.src = src;
    
    // Attempt to play
    video.play().catch(e => {
      console.error('Native video play failed:', e);
      onError(e);
    });
    
    // Set success handler
    onSuccess(PlaybackMethod.NATIVE);
    
    return { videoElement: video };
  } catch (e) {
    console.error('Error with native video:', e);
    onError(e);
    return { videoElement: video };
  }
};

// Cleanup player instances
export const cleanupPlayers = (
  vjsPlayer: any, 
  hlsInstance: Hls | null, 
  mpegtsPlayer: any, 
  videoElement: HTMLVideoElement | null
) => {
  // Clean up VideoJS
  if (vjsPlayer) {
    try {
      vjsPlayer.dispose();
    } catch (e) {
      console.error('Error cleaning up VideoJS:', e);
    }
  }
  
  // Clean up HLS.js
  if (hlsInstance) {
    try {
      hlsInstance.destroy();
    } catch (e) {
      console.error('Error cleaning up HLS.js:', e);
    }
  }
  
  // Clean up mpegts.js
  if (mpegtsPlayer) {
    try {
      mpegtsPlayer.destroy();
    } catch (e) {
      console.error('Error cleaning up mpegts.js:', e);
    }
  }
  
  // Remove video element
  if (videoElement && videoElement.parentNode) {
    try {
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();
      videoElement.parentNode.removeChild(videoElement);
    } catch (e) {
      console.error('Error removing video element:', e);
    }
  }
};