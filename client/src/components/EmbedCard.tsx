import React from 'react';

interface EmbedCardProps {
  videoId: string;
  start?: number;
  title?: string;
  author?: string;
  className?: string;
}

export function EmbedCard({ videoId, start, title, author, className = '' }: EmbedCardProps) {
  // Convert to embed URL for iframe
  const getEmbedUrl = (videoId: string, start?: number): string => {
    let embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    if (start) {
      embedUrl += `?start=${start}`;
    }
    return embedUrl;
  };

  const embedUrl = getEmbedUrl(videoId, start);
  
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
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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