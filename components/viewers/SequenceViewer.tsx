'use client';

import { useState, useEffect, useRef } from 'react';

interface SequenceItem {
  position: number;
  type: 'image' | 'video';
  // Image fields
  image_url?: string;
  alt_text?: string;
  narration?: string;
  // Video fields
  video_id?: string;
  url?: string;
  title?: string;
}

interface SequenceViewerProps {
  title: string;
  description?: string;
  items: SequenceItem[];
  initialIndex?: number;
}

export default function SequenceViewer({
  title,
  description,
  items,
  initialIndex = 0
}: SequenceViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const minSwipeDistance = 50;

  // Navigation functions
  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen?.();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, items.length, isFullscreen]);

  // Fullscreen handler
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header - only show when not fullscreen */}
      {!isFullscreen && (
        <div className="bg-gradient-to-br from-purple-900/80 to-pink-900/80 backdrop-blur-sm p-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {description && <p className="text-gray-300 text-lg">{description}</p>}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {currentItem.type === 'image' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <img
              src={`/api/proxy-image?url=${encodeURIComponent(currentItem.image_url || '')}`}
              alt={currentItem.alt_text || `Item ${currentItem.position}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {currentItem.narration && (
              <div className="mt-4 max-w-2xl mx-auto text-center">
                <p className="text-white text-lg px-6 py-3 bg-black/50 rounded-lg backdrop-blur-sm">
                  {currentItem.narration}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 relative">
            <div className="w-full max-w-4xl">
              {currentItem.video_id && currentItem.video_id.length === 11 ? (
                // YouTube video (11 character ID)
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentItem.video_id}?rel=0&modestbranding=1`}
                  title={currentItem.title || `Video ${currentItem.position}`}
                  className="w-full aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                // Google Drive video (longer ID)
                <iframe
                  src={`https://drive.google.com/file/d/${currentItem.video_id}/preview`}
                  title={currentItem.title || `Video ${currentItem.position}`}
                  className="w-full aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            {currentItem.title && (
              <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                <p className="text-white text-lg px-6 py-3 bg-black/50 rounded-lg backdrop-blur-sm inline-block">
                  {currentItem.title}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Arrows - Desktop only, large touch targets */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full">
            {currentIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hidden md:flex"
                aria-label="Previous"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {currentIndex < items.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hidden md:flex"
                aria-label="Next"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls Overlay - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none">
        {/* Page Counter */}
        <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm pointer-events-auto">
          {currentIndex + 1} / {items.length}
        </div>

        {/* Fullscreen Button - Large touch target */}
        <button
          onClick={toggleFullscreen}
          className="pointer-events-auto w-14 h-14 bg-black/70 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile swipe hint - show briefly on first load */}
      {currentIndex === 0 && !isFullscreen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none md:hidden animate-pulse">
          <p className="text-white text-sm bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
            ← Swipe to navigate →
          </p>
        </div>
      )}
    </div>
  );
}
