import { useState } from 'react';
// @ts-ignore
import { getMediaType } from '../lib/media';

interface MediaDisplayProps {
  mediaUrls: string[];
  className?: string;
  showControls?: boolean;
}

/**
 * Instagram-style media display component for posts
 * Handles both images and videos with proper responsive layout
 */
export function MediaDisplay({ mediaUrls, className = '', showControls = true }: MediaDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const handleImageError = (url: string) => {
    setImageErrors(prev => ({ ...prev, [url]: true }));
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : mediaUrls.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < mediaUrls.length - 1 ? prev + 1 : 0));
  };

  const currentMediaUrl = mediaUrls[currentIndex];
  const mediaType = getMediaType(currentMediaUrl);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Main Media Display */}
      <div className="relative w-full aspect-square">
        {mediaType === 'image' && !imageErrors[currentMediaUrl] ? (
          <img
            src={currentMediaUrl}
            alt="Post media"
            className="w-full h-full object-cover"
            onError={() => handleImageError(currentMediaUrl)}
          />
        ) : mediaType === 'video' ? (
          <video
            src={currentMediaUrl}
            controls={showControls}
            className="w-full h-full object-cover"
            preload="metadata"
          >
            <source src={currentMediaUrl} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Media unavailable</p>
            </div>
          </div>
        )}

        {/* Navigation arrows for multiple media */}
        {mediaUrls.length > 1 && showControls && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
              aria-label="Previous media"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
              aria-label="Next media"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Media type indicator */}
        {mediaType === 'video' && (
          <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            Video
          </div>
        )}
      </div>

      {/* Dots indicator for multiple media */}
      {mediaUrls.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {mediaUrls.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-white' 
                  : 'bg-white bg-opacity-50 hover:bg-opacity-70'
              }`}
              aria-label={`Go to media ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Media counter */}
      {mediaUrls.length > 1 && showControls && (
        <div className="absolute top-3 left-3 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {mediaUrls.length}
        </div>
      )}
    </div>
  );
}