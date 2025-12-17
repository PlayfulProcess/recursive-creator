'use client';

import { useRouter } from 'next/navigation';

interface SequenceItem {
  type: 'image' | 'video';
  image_url?: string;
  video_id?: string;
  title?: string;
}

interface SequenceCardProps {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  items?: SequenceItem[];
  items_count: number;
  is_published: boolean;
  is_reviewed: boolean;
  created_at: string;
  hashtags?: string[];
  onDelete: (id: string) => void;
}

function getProxiedImageUrl(url: string): string {
  // Check if it's a Drive URL that needs proxying
  if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getThumbnailUrl(sequence: SequenceCardProps): string | null {
  // First priority: explicit thumbnail_url
  if (sequence.thumbnail_url) {
    return getProxiedImageUrl(sequence.thumbnail_url);
  }

  // Second priority: first image in items
  if (sequence.items && sequence.items.length > 0) {
    const firstImage = sequence.items.find(item => item.type === 'image' && item.image_url);
    if (firstImage?.image_url) {
      return getProxiedImageUrl(firstImage.image_url);
    }

    // Third priority: YouTube thumbnail
    const firstVideo = sequence.items.find(item => item.type === 'video' && item.video_id);
    if (firstVideo?.video_id && firstVideo.video_id.length === 11) {
      return `https://img.youtube.com/vi/${firstVideo.video_id}/mqdefault.jpg`;
    }
  }

  return null;
}

export default function SequenceCard({
  id,
  title,
  description,
  thumbnail_url,
  items,
  items_count,
  is_published,
  is_reviewed,
  created_at,
  hashtags,
  onDelete,
}: SequenceCardProps) {
  const router = useRouter();

  const thumbnailUrl = getThumbnailUrl({
    id,
    title,
    description,
    thumbnail_url,
    items,
    items_count,
    is_published,
    is_reviewed,
    created_at,
    hashtags,
    onDelete,
  });

  const getStatusBadge = () => {
    if (is_published) {
      return (
        <span className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400">
          Published
        </span>
      );
    } else if (is_reviewed) {
      return (
        <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400">
          Rejected
        </span>
      );
    } else {
      return (
        <span className="text-xs px-2 py-1 rounded bg-yellow-600/20 text-yellow-400">
          Draft
        </span>
      );
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all group">
      {/* Thumbnail */}
      <div
        className="aspect-video bg-gray-900 relative cursor-pointer"
        onClick={() => router.push(`/dashboard/sequences/new?id=${id}`)}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder on error
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {/* Placeholder (shown when no thumbnail or on error) */}
        <div className={`w-full h-full flex items-center justify-center text-5xl absolute inset-0 ${thumbnailUrl ? 'hidden' : ''}`}>
          <span className="opacity-50">
            {items && items.some(i => i.type === 'video') ? '🎬' : '🖼️'}
          </span>
        </div>

        {/* Item count badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          {items_count} {items_count === 1 ? 'item' : 'items'}
        </span>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-medium">Edit Project</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-semibold text-white truncate cursor-pointer hover:text-purple-400 transition-colors"
          onClick={() => router.push(`/dashboard/sequences/new?id=${id}`)}
        >
          {title || 'Untitled Project'}
        </h3>

        {description && (
          <p className="text-sm text-gray-400 line-clamp-2 mt-1">
            {description}
          </p>
        )}

        {/* Hashtags */}
        {hashtags && hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {hashtags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
            {hashtags.length > 3 && (
              <span className="text-xs text-gray-500">+{hashtags.length - 3}</span>
            )}
          </div>
        )}

        {/* Date */}
        <p className="text-xs text-gray-500 mt-2">
          {new Date(created_at).toLocaleDateString()}
        </p>

        {/* Status & Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
          {getStatusBadge()}

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/sequences/new?id=${id}`)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(id)}
              className="text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Published URL */}
        {is_published && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`https://recursive.eco/view/${id}`}
                readOnly
                className="flex-1 text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded font-mono text-gray-300 truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://recursive.eco/view/${id}`);
                }}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                title="Copy link"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
