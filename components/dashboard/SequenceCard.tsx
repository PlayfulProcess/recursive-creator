'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SequenceItem {
  type: 'image' | 'video';
  image_url?: string;
  video_id?: string;
  title?: string;
}

// Available channels for submission
const AVAILABLE_CHANNELS = [
  { id: 'kids-stories', name: 'Kids Stories', icon: '📚' },
  { id: 'wellness', name: 'Wellness', icon: '🧘' },
  { id: 'learning', name: 'Learning', icon: '📖' },
];

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
  creator_name?: string;
  creator_link?: string;
  onDelete: (id: string) => void;
  onUnsubmit: (id: string) => void;
  onPublish: (id: string) => void;
}

function getProxiedImageUrl(url: string): string {
  if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getThumbnailUrl(props: SequenceCardProps): string | null {
  if (props.thumbnail_url) {
    return getProxiedImageUrl(props.thumbnail_url);
  }

  if (props.items && props.items.length > 0) {
    const firstImage = props.items.find(item => item.type === 'image' && item.image_url);
    if (firstImage?.image_url) {
      return getProxiedImageUrl(firstImage.image_url);
    }

    const firstVideo = props.items.find(item => item.type === 'video' && item.video_id);
    if (firstVideo?.video_id && firstVideo.video_id.length === 11) {
      return `https://img.youtube.com/vi/${firstVideo.video_id}/mqdefault.jpg`;
    }
  }

  return null;
}

export default function SequenceCard(props: SequenceCardProps) {
  const {
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
    creator_name,
    creator_link,
    onDelete,
    onUnsubmit,
    onPublish,
  } = props;

  const router = useRouter();
  const [showChannelMenu, setShowChannelMenu] = useState(false);

  const thumbnailUrl = getThumbnailUrl(props);
  const publicViewUrl = `https://recursive.eco/view/${id}`;

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

  const buildChannelSubmitUrl = (channelId: string) => {
    const params = new URLSearchParams();
    params.set('doc_id', id);
    params.set('channel', channelId);
    params.set('title', title);
    if (description) params.set('description', description);
    if (creator_name) params.set('creator_name', creator_name);
    if (creator_link) params.set('creator_link', creator_link);
    if (thumbnail_url) params.set('thumbnail_url', thumbnail_url);
    if (hashtags && hashtags.length > 0) params.set('hashtags', hashtags.join(','));
    return `https://channels.recursive.eco/channels/${channelId}?${params.toString()}`;
  };

  const handleCardClick = () => {
    if (is_published) {
      // Open public view in new tab
      window.open(publicViewUrl, '_blank');
    } else {
      // Go to edit if not published
      router.push(`/dashboard/sequences/new?id=${id}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all group relative">
      {/* Thumbnail */}
      <div
        className="aspect-video bg-gray-900 relative cursor-pointer"
        onClick={handleCardClick}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {/* Placeholder */}
        <div className={`w-full h-full flex items-center justify-center text-5xl absolute inset-0 ${thumbnailUrl ? 'hidden' : ''}`}>
          <span className="opacity-50">
            {items && items.some(i => i.type === 'video') ? '🎬' : '🖼️'}
          </span>
        </div>

        {/* Item count badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          {items_count} {items_count === 1 ? 'item' : 'items'}
        </span>

        {/* Status badge on thumbnail */}
        <div className="absolute top-2 left-2">
          {getStatusBadge()}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-medium">
            {is_published ? 'View Project' : 'Edit Project'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-semibold text-white truncate cursor-pointer hover:text-purple-400 transition-colors"
          onClick={handleCardClick}
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

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-700">
          {/* Edit Button */}
          <button
            onClick={() => router.push(`/dashboard/sequences/new?id=${id}`)}
            className="flex-1 px-3 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ✏️ Edit
          </button>

          {/* Publish Button - Only for unpublished */}
          {!is_published && (
            <button
              onClick={() => onPublish(id)}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              🌐 Publish
            </button>
          )}

          {/* Submit to Channel - Only for published */}
          {is_published && (
            <div className="relative flex-1">
              <button
                onClick={() => setShowChannelMenu(!showChannelMenu)}
                className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                📤 Submit
              </button>

              {/* Channel dropdown */}
              {showChannelMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-700 rounded-lg shadow-lg border border-gray-600 overflow-hidden z-10">
                  <div className="text-xs text-gray-400 px-3 py-2 border-b border-gray-600">
                    Submit to channel:
                  </div>
                  {AVAILABLE_CHANNELS.map((channel) => (
                    <a
                      key={channel.id}
                      href={buildChannelSubmitUrl(channel.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 text-sm text-white hover:bg-gray-600 transition-colors"
                      onClick={() => setShowChannelMenu(false)}
                    >
                      {channel.icon} {channel.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unsubmit from Channels - Only for published */}
          {is_published && (
            <button
              onClick={() => onUnsubmit(id)}
              className="px-3 py-2 text-sm bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 transition-colors"
              title="Remove from all channels (keeps direct link working)"
            >
              🔒
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={() => onDelete(id)}
            className="px-3 py-2 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
            title="Delete project"
          >
            🗑️
          </button>
        </div>

        {/* Published URL - Compact */}
        {is_published && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={publicViewUrl}
                readOnly
                className="flex-1 text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded font-mono text-gray-300 truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicViewUrl);
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

      {/* Click outside to close channel menu */}
      {showChannelMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowChannelMenu(false)}
        />
      )}
    </div>
  );
}
