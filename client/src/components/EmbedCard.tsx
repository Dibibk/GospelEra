import React from 'react';
import { Capacitor } from '@capacitor/core';

interface EmbedCardProps {
  videoId: string;
  start?: number;
  title?: string;
  author?: string;
  className?: string;
}

export function EmbedCard({ videoId, start, title, author, className = '' }: EmbedCardProps) {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  
  // Convert to embed URL for iframe
  const getEmbedUrl = (videoId: string, start?: number): string => {
    let embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    const params = [];
    if (start) params.push(`start=${start}`);
    // Add playsinline for iOS
    if (isNative) params.push('playsinline=1');
    if (params.length > 0) {
      embedUrl += `?${params.join('&')}`;
    }
    return embedUrl;
  };

  // Get YouTube app/web URL for native apps
  const getYouTubeUrl = (videoId: string, start?: number): string => {
    let url = `https://www.youtube.com/watch?v=${videoId}`;
    if (start) url += `&t=${start}s`;
    return url;
  };

  const embedUrl = getEmbedUrl(videoId, start);
  const youtubeUrl = getYouTubeUrl(videoId, start);
  
  // For iOS: Show plain text URL only (Apple App Store requirement 5.2.3)
  if (isIOS) {
    return (
      <a 
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="youtube-link"
        style={{ 
          color: '#1a73e8',
          fontSize: '14px',
          wordBreak: 'break-all'
        }}
      >
        {youtubeUrl}
      </a>
    );
  }
  
  // For Android: Show clickable thumbnail that opens YouTube
  if (isAndroid) {
    return (
      <a 
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block relative w-full bg-gray-100 rounded-lg overflow-hidden ${className}`}
        data-testid="youtube-link"
      >
        {/* 16:9 Aspect Ratio Container with Thumbnail */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt={title || 'YouTube video'}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Fallback to standard quality thumbnail
              e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <svg 
              className="w-16 h-16 text-white drop-shadow-lg" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          {/* YouTube logo */}
          <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
            YouTube
          </div>
        </div>
        
        {/* Video Info */}
        {(title || author) && (
          <div className="p-3 bg-white border-t border-gray-200">
            {title && (
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                {title}
              </h4>
            )}
            {author && (
              <p className="text-xs text-gray-600">
                by {author}
              </p>
            )}
          </div>
        )}
      </a>
    );
  }
  
  // For web, use iframe embed
  return (
    <div className={`relative w-full bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* 16:9 Aspect Ratio Container */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={title || 'YouTube video'}
        />
      </div>
      
      {/* Video Info */}
      {(title || author) && (
        <div className="p-3 bg-white border-t border-gray-200">
          {title && (
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
              {title}
            </h4>
          )}
          {author && (
            <p className="text-xs text-gray-600">
              by {author}
            </p>
          )}
        </div>
      )}
    </div>
  );
}