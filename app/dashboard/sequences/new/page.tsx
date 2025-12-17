'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import SequenceViewer from '@/components/viewers/SequenceViewer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const MAX_ITEMS = 50; // Security limit

type ItemType = 'image' | 'video';

interface SequenceItem {
  position: number;
  type: ItemType;
  // Image fields
  image_url?: string;
  alt_text?: string;
  narration?: string;
  // Video fields
  video_id?: string;
  url?: string;
  title?: string;
  creator?: string;           // YouTube channel name
  thumbnail?: string;         // Better quality thumbnail URL
  duration_seconds?: number;  // Video duration in seconds
}

interface VideoMetadata {
  title: string;
  creator: string;
  thumbnail: string;
  duration_seconds: number;
}

interface SortableItemCardProps {
  id: string;
  item: SequenceItem;
  index: number;
  onDelete: () => void;
  onEditTitle: (newTitle: string) => void;
  onPositionClick: () => void;
}

function SortableItemCard({ id, item, index, onDelete, onEditTitle, onPositionClick }: SortableItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-700 rounded-lg p-4 mb-3 border border-gray-600 flex items-center gap-4"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white text-2xl"
      >
        ≡
      </div>

      {/* Position Badge */}
      <div
        onClick={onPositionClick}
        className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-purple-700 transition-colors"
      >
        {index + 1}
      </div>

      {/* Thumbnail */}
      {item.type === 'video' ? (
        item.video_id && item.video_id.length === 11 ? (
          <img
            src={item.thumbnail || `https://i.ytimg.com/vi/${item.video_id}/mqdefault.jpg`}
            alt={item.title || 'Video thumbnail'}
            className="w-32 h-18 object-cover rounded"
          />
        ) : (
          <div className="w-32 h-18 bg-gray-600 rounded flex items-center justify-center text-gray-400 text-xs">
            Drive Video
          </div>
        )
      ) : (
        <img
          src={`/api/proxy-image?url=${encodeURIComponent(item.image_url || '')}`}
          alt={item.alt_text || 'Image'}
          className="w-32 h-18 object-cover rounded"
          onError={(e) => {
            // Fallback for broken images
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="72"%3E%3Crect fill="%23374151" width="128" height="72"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EImage%3C/text%3E%3C/svg%3E';
          }}
        />
      )}

      {/* Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{item.type === 'video' ? '🎥' : '📷'}</span>
          <span className="text-white font-semibold truncate">
            {item.type === 'video'
              ? (item.title || item.video_id || 'Untitled')
              : (item.alt_text || 'Untitled')}
          </span>
        </div>
        <div className="text-gray-400 text-sm font-mono truncate">
          ID: {item.video_id || item.image_url?.split('/').pop()?.substring(0, 20) || 'N/A'}
        </div>
        {item.type === 'video' && item.creator && (
          <div className="text-gray-400 text-sm truncate">
            By: {item.creator}
          </div>
        )}
        {item.type === 'image' && (
          <div className="text-gray-400 text-sm truncate">
            <span className="italic">Author: (sequence author will be used)</span>
          </div>
        )}

        {/* Inline Title Edit */}
        <input
          type="text"
          value={item.type === 'video' ? (item.title || '') : (item.alt_text || '')}
          onChange={(e) => onEditTitle(e.target.value)}
          placeholder={item.type === 'video' ? 'Video title...' : 'Alt text...'}
          className="mt-2 w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
        />
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="text-red-500 hover:text-red-400 text-2xl font-bold"
      >
        ×
      </button>
    </div>
  );
}

function NewSequencePageContent() {
  const { user, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  const editingId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<SequenceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedDocId, setPublishedDocId] = useState<string | null>(null);
  const [isReported, setIsReported] = useState(false); // Track if content has been reported

  // Drive folder import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [folderUrl, setFolderUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // YouTube playlist import modal
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importingPlaylist, setImportingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  // YouTube Kids channel import modal
  const [showKidsChannelModal, setShowKidsChannelModal] = useState(false);
  const [kidsChannelUrl, setKidsChannelUrl] = useState('');
  const [importingKidsChannel, setImportingKidsChannel] = useState(false);
  const [kidsChannelError, setKidsChannelError] = useState<string | null>(null);

  // Import Links modal (bulk URL import)
  const [showImportLinksModal, setShowImportLinksModal] = useState(false);
  const [modalBulkUrls, setModalBulkUrls] = useState('');

  // Store video metadata (URL → title mapping) from YouTube API
  const [videoMetadata, setVideoMetadata] = useState<Map<string, VideoMetadata>>(new Map());

  // Channel selection modal
  const [showChannelSelectModal, setShowChannelSelectModal] = useState(false);

  // License agreement
  const [licenseAgreed, setLicenseAgreed] = useState(false);

  // Track unsaved changes for floating save button
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Position modal state
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [newPosition, setNewPosition] = useState('');

  // Items view expansion state
  const [itemsExpanded, setItemsExpanded] = useState(false);

  // Optional channel submission fields
  const [creatorName, setCreatorName] = useState('');
  const [creatorLink, setCreatorLink] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');

  // Details section expansion state
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Available channels for submission (matching channels.recursive.eco header)
  const AVAILABLE_CHANNELS = [
    { id: 'kids-stories', name: 'Community Kids Stories', description: 'Parent-Created Stories for Children' },
    { id: 'wellness', name: 'Wellness', description: 'Interactive Tools for a better life' },
    { id: 'resources', name: 'Resources for Parents', description: 'Curated Content for Parenting, Growth, and Family Wellbeing' },
  ];

  // Setup drag-and-drop sensors for touch, mouse, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      // Require minimal movement before starting drag (prevents accidental drags)
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load sequence data when editing
  useEffect(() => {
    if (editingId && user) {
      loadSequence(editingId);
    }
  }, [editingId, user]);

  // Load draft from localStorage for new sequences (not editing existing)
  useEffect(() => {
    if (!editingId && !loading) {
      const savedDraft = localStorage.getItem('sequence-draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.title) setTitle(draft.title);
          if (draft.description) setDescription(draft.description);
          if (draft.items && draft.items.length > 0) setItems(draft.items);
          if (draft.creatorName) setCreatorName(draft.creatorName);
          if (draft.creatorLink) setCreatorLink(draft.creatorLink);
          if (draft.thumbnailUrl) setThumbnailUrl(draft.thumbnailUrl);
          if (draft.hashtags) setHashtags(draft.hashtags);
          console.log('Loaded draft from localStorage');
        } catch (e) {
          console.error('Failed to load draft:', e);
        }
      }
    }
  }, [editingId, loading]);

  // Save draft to localStorage when form changes (only for new sequences)
  useEffect(() => {
    if (!editingId && !saving && !loading) {
      const draft = {
        title,
        description,
        items,
        creatorName,
        creatorLink,
        thumbnailUrl,
        hashtags,
        savedAt: new Date().toISOString()
      };
      // Only save if there's actually content
      if (title || description || items.length > 0) {
        localStorage.setItem('sequence-draft', JSON.stringify(draft));
      }
    }
  }, [title, description, items, creatorName, creatorLink, thumbnailUrl, hashtags, editingId, saving, loading]);

  // Track unsaved changes (but ignore initial load)
  useEffect(() => {
    // Don't mark as unsaved on initial load or during save
    if (saving || loading) return;

    // If we have title or items, consider it changed (unless just loaded)
    if (title || description || items.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [title, description, items, saving, loading]);

  // Keyboard navigation: CTRL+END to scroll to items container
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'End') {
        e.preventDefault();
        itemsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadSequence = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;

      setTitle(data.document_data.title || '');
      setDescription(data.document_data.description || '');

      // Load channel fields - check tools table FIRST (most recent), then fall back to user_documents
      let creatorNameValue = '';
      let creatorLinkValue = '';
      let thumbnailUrlValue = '';
      let hashtagsValue: string[] = [];

      // Step 1: Try to get from tools table (channel submissions have most recent data)
      const { data: toolsData } = await supabase
        .from('tools')
        .select('tool_data')
        .ilike('tool_data->>url', `%${id}%`)
        .eq('tool_data->>is_active', 'true')
        .limit(1)
        .single();

      if (toolsData?.tool_data) {
        console.log('Found channel submission data (priority):', toolsData.tool_data);
        creatorNameValue = toolsData.tool_data.submitted_by || '';
        thumbnailUrlValue = toolsData.tool_data.thumbnail || '';
        if (toolsData.tool_data.hashtags) {
          hashtagsValue = Array.isArray(toolsData.tool_data.hashtags)
            ? toolsData.tool_data.hashtags
            : toolsData.tool_data.hashtags.split(',').map((h: string) => h.trim());
        }
      }

      // Step 2: Fall back to user_documents for any missing fields
      if (!creatorNameValue) {
        creatorNameValue = data.document_data.creator_name || data.document_data.author || '';
      }
      if (!creatorLinkValue) {
        creatorLinkValue = data.document_data.creator_link || '';
      }
      if (!thumbnailUrlValue) {
        thumbnailUrlValue = data.document_data.thumbnail_url || '';
      }
      if (!hashtagsValue.length) {
        hashtagsValue = data.document_data.hashtags || [];
      }

      console.log('Final channel fields (tools → user_documents fallback):', {
        creator_name: creatorNameValue,
        creator_link: creatorLinkValue,
        thumbnail_url: thumbnailUrlValue,
        hashtags: hashtagsValue
      });

      setCreatorName(creatorNameValue);
      setCreatorLink(creatorLinkValue);
      setThumbnailUrl(thumbnailUrlValue);
      setHashtags(hashtagsValue);

      // Check if published (from document_data.is_published)
      const isPublishedValue = data.document_data.is_published === 'true';
      setIsPublished(isPublishedValue);

      // Check if reported (blocks re-publishing)
      const isReportedValue = data.reported === true;
      setIsReported(isReportedValue);

      // Set published URL and doc ID if published
      if (isPublishedValue) {
        setPublishedUrl(`https://recursive.eco/view/${id}`);
        setPublishedDocId(id);
      } else {
        setPublishedUrl(null);
        setPublishedDocId(null);
      }

      if (data.document_data.items && data.document_data.items.length > 0) {
        // Unwrap double-proxied URLs from old data
        const cleanedItems = data.document_data.items.map((item: SequenceItem) => {
          if (item.type === 'image' && item.image_url) {
            // Check if URL is double-wrapped: /api/proxy-image?url=/api/proxy-image?url=...
            const doubleProxyMatch = item.image_url.match(/\/api\/proxy-image\?url=(.+)/);
            if (doubleProxyMatch) {
              const innerUrl = decodeURIComponent(doubleProxyMatch[1]);
              // Check if inner URL is also proxied
              const innerProxyMatch = innerUrl.match(/\/api\/proxy-image\?url=(.+)/);
              if (innerProxyMatch) {
                // Double-wrapped! Extract the real URL
                return { ...item, image_url: decodeURIComponent(innerProxyMatch[1]) };
              } else {
                // Single-wrapped, extract the URL
                return { ...item, image_url: innerUrl };
              }
            }
          }
          return item;
        });
        setItems(cleanedItems);
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const convertGoogleDriveUrl = (url: string): string => {
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([^\/]+)/,
      /drive\.google\.com\/open\?id=([^&]+)/,
    ];

    for (const pattern of drivePatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }

    return url;
  };

  const convertGoogleDriveVideoUrl = (url: string): string => {
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([^\/]+)/,
      /drive\.google\.com\/open\?id=([^&]+)/,
    ];

    for (const pattern of drivePatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Use Google Drive embed URL for videos
        return match[1]; // Return just the ID, we'll use it in iframe
      }
    }

    return url;
  };

  const extractYouTubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,  // YouTube Shorts support
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url;
  };

  const detectUrlType = (url: string): { type: ItemType; processedUrl: string } => {
    const trimmedUrl = url.trim();

    // Check for manual type prefix: "video: URL" or "image: URL"
    const videoPrefixMatch = trimmedUrl.match(/^video:\s*(.+)/i);
    const imagePrefixMatch = trimmedUrl.match(/^image:\s*(.+)/i);

    if (videoPrefixMatch) {
      return { type: 'video', processedUrl: videoPrefixMatch[1].trim() };
    }

    if (imagePrefixMatch) {
      return { type: 'image', processedUrl: imagePrefixMatch[1].trim() };
    }

    // YouTube detection
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
      return { type: 'video', processedUrl: trimmedUrl };
    }

    // Drive detection - default to image unless prefixed
    if (trimmedUrl.includes('drive.google.com')) {
      return { type: 'image', processedUrl: trimmedUrl };
    }

    // Default to image for other URLs
    return { type: 'image', processedUrl: trimmedUrl };
  };

  const handleImportDriveFolder = async () => {
    if (!folderUrl.trim()) {
      setImportError('Please enter a folder URL');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const response = await fetch('/api/import-drive-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import folder');
      }

      // Parse files and append directly to items
      const newItems: SequenceItem[] = [];
      const startPosition = items.length;

      data.files.forEach((file: { url: string; name: string; mimeType: string }, index: number) => {
        const { type, processedUrl } = detectUrlType(file.url);

        if (type === 'video') {
          if (processedUrl.includes('drive.google.com')) {
            const driveId = convertGoogleDriveVideoUrl(processedUrl);
            newItems.push({
              position: startPosition + index + 1,
              type: 'video',
              video_id: driveId,
              url: processedUrl,
              title: file.name  // ← Use Drive file name as title
            });
          }
        } else {
          const convertedUrl = convertGoogleDriveUrl(processedUrl);
          newItems.push({
            position: startPosition + index + 1,
            type: 'image',
            image_url: convertedUrl,
            alt_text: file.name,  // ← Use Drive file name as alt text
            narration: ''
          });
        }
      });

      // Append to items
      setItems(prev => [...prev, ...newItems]);

      // Close modal
      setShowImportModal(false);
      setFolderUrl('');

      // Show success message
      setError(`✅ Imported ${data.count} files!`);

    } catch (err: any) {
      setImportError(err.message || 'Failed to import folder');
    } finally {
      setImporting(false);
    }
  };

  const handleImportPlaylist = async () => {
    if (!playlistUrl.trim()) {
      setPlaylistError('Please enter a playlist URL');
      return;
    }

    setImportingPlaylist(true);
    setPlaylistError(null);

    try {
      const response = await fetch('/api/extract-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import playlist');
      }

      // Create items directly from video data (already has full metadata!)
      const newItems: SequenceItem[] = [];
      const startPosition = items.length;

      data.videos.forEach((v: any, index: number) => {
        newItems.push({
          position: startPosition + index + 1,
          type: 'video',
          video_id: extractYouTubeId(v.url),
          url: v.url,
          title: v.title,
          creator: v.creator,
          thumbnail: v.thumbnail,
          duration_seconds: v.duration_seconds
        });
      });

      // Append to items
      setItems(prev => [...prev, ...newItems]);

      // Close modal
      setShowPlaylistModal(false);
      setPlaylistUrl('');

      // Show success message
      setError(`✅ Imported ${data.count} videos from playlist!`);

    } catch (err: any) {
      setPlaylistError(err.message || 'Failed to import playlist');
    } finally {
      setImportingPlaylist(false);
    }
  };

  const handleImportKidsChannel = async () => {
    if (!kidsChannelUrl.trim()) {
      setKidsChannelError('Please enter a YouTube Kids channel URL');
      return;
    }

    setImportingKidsChannel(true);
    setKidsChannelError(null);

    try {
      const response = await fetch('/api/extract-youtube-kids-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: kidsChannelUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import YouTube Kids channel');
      }

      // Create items directly from video data
      const newItems: SequenceItem[] = [];
      const startPosition = items.length;

      data.videos.forEach((v: any, index: number) => {
        newItems.push({
          position: startPosition + index + 1,
          type: 'video',
          video_id: v.video_id,
          url: v.url,
          title: v.title,
          thumbnail: v.thumbnail
        });
      });

      // Append to items
      setItems(prev => [...prev, ...newItems]);

      // Close modal
      setShowKidsChannelModal(false);
      setKidsChannelUrl('');

      // Show success message
      setError(`✅ Imported ${data.count} videos from YouTube Kids channel!`);

    } catch (err: any) {
      setKidsChannelError(err.message || 'Failed to import YouTube Kids channel');
    } finally {
      setImportingKidsChannel(false);
    }
  };

  const handleImportFromModal = () => {
    if (!modalBulkUrls.trim()) {
      // Empty textarea = do nothing
      setShowImportLinksModal(false);
      setModalBulkUrls('');
      return;
    }

    // Parse URLs from modal (same logic as handleParseBulkUrls)
    const lines = modalBulkUrls.split(/[\n,]+/).filter(line => line.trim());

    // Check total count (existing + new)
    if (items.length + lines.length > MAX_ITEMS) {
      setError(`Maximum ${MAX_ITEMS} items allowed. You have ${items.length} existing items and ${lines.length} new URLs = ${items.length + lines.length} total.`);
      return;
    }

    const newItems: SequenceItem[] = [];
    const startPosition = items.length; // Start positions after existing items

    lines.forEach((line, index) => {
      const { type, processedUrl } = detectUrlType(line);

      if (type === 'video') {
        // Check if it's YouTube or Drive
        if (processedUrl.includes('youtube.com') || processedUrl.includes('youtu.be')) {
          const videoId = extractYouTubeId(processedUrl);
          // Check if we have full metadata from YouTube API import
          const metadata: VideoMetadata | undefined = videoMetadata.get(processedUrl);
          newItems.push({
            position: startPosition + index + 1,
            type: 'video',
            video_id: videoId,
            url: processedUrl,
            title: metadata?.title || '',
            creator: metadata?.creator || '',
            thumbnail: metadata?.thumbnail || '',
            duration_seconds: metadata?.duration_seconds || 0
          });
        } else if (processedUrl.includes('drive.google.com')) {
          // Drive video
          const driveId = convertGoogleDriveVideoUrl(processedUrl);
          newItems.push({
            position: startPosition + index + 1,
            type: 'video',
            video_id: driveId,  // Drive file ID
            url: processedUrl,
            title: ''
          });
        } else {
          // Unknown video type, skip
          console.warn('Unknown video URL format:', processedUrl);
        }
      } else {
        const convertedUrl = convertGoogleDriveUrl(processedUrl);
        newItems.push({
          position: startPosition + index + 1,
          type: 'image',
          image_url: convertedUrl,
          alt_text: '',
          narration: ''
        });
      }
    });

    // APPEND new items to existing items
    setItems(prev => [...prev, ...newItems]);

    // Close modal and clear textarea
    setShowImportLinksModal(false);
    setModalBulkUrls('');

    // Show success message
    setError(`✅ Imported ${newItems.length} items!`);
  };

  const handleExportLinks = () => {
    if (items.length === 0) {
      setError('No items to export');
      return;
    }

    // Generate URLs for all items
    const urls = items.map(item => {
      if (item.type === 'video') {
        // Return original YouTube URL or construct from video_id
        if (item.url) return item.url;
        if (item.video_id && item.video_id.length === 11) {
          return `https://youtube.com/watch?v=${item.video_id}`;
        }
        // Drive video
        return `https://drive.google.com/file/d/${item.video_id}/view`;
      } else {
        // Image - return the original URL
        return item.image_url || '';
      }
    }).filter(url => url);

    // Copy to clipboard
    const exportText = urls.join('\n');
    navigator.clipboard.writeText(exportText).then(() => {
      setError(`✅ Copied ${urls.length} links to clipboard!`);
    }).catch(() => {
      // Fallback: show in modal
      setModalBulkUrls(exportText);
      setShowImportLinksModal(true);
      setError('Links ready in modal - copy from there');
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = parseInt(active.id as string);
        const newIndex = parseInt(over.id as string);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Renumber positions
        newItems.forEach((item, i) => {
          item.position = i + 1;
        });

        return newItems;
      });
    }
  };

  const handleEditItemTitle = (index: number, newTitle: string) => {
    setItems(prevItems => {
      const updated = [...prevItems];
      if (updated[index].type === 'video') {
        updated[index].title = newTitle;
      } else {
        updated[index].alt_text = newTitle;
      }
      return updated;
    });
  };

  const handleToggleExpand = () => {
    const newExpanded = !itemsExpanded;
    setItemsExpanded(newExpanded);

    // When expanding, scroll to the items container after a brief delay
    if (newExpanded) {
      setTimeout(() => {
        itemsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Position modal handlers
  const handlePositionClick = (index: number) => {
    setSelectedItemIndex(index);
    setNewPosition(String(index + 1));
    setShowPositionModal(true);
  };

  const handleMoveToPosition = (targetPosition: number) => {
    if (selectedItemIndex === null || targetPosition < 1 || targetPosition > items.length) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(selectedItemIndex, 1);
    newItems.splice(targetPosition - 1, 0, movedItem);

    // Renumber all positions
    newItems.forEach((item, i) => {
      item.position = i + 1;
    });

    setItems(newItems);
    setShowPositionModal(false);
    setSelectedItemIndex(null);
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => item.position = i + 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSaveDraft = async (forcePublished?: boolean, silentSave = false) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Filter out items with empty content
    const validItems = items.filter(item => {
      if (item.type === 'image') {
        return item.image_url && item.image_url.trim() !== '';
      } else {
        return item.video_id && item.video_id.trim() !== '';
      }
    });

    if (validItems.length === 0) {
      setError('At least one item with content is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    // Use the parameter to determine publish state, NOT the state variable
    const shouldPublish = forcePublished !== undefined ? forcePublished : isPublished;

    try {
      if (editingId) {
        // UPDATE MODE: Save over existing project
        const wasPublished = publishedUrl !== null; // Track if was already published

        const { data: updateData, error: updateError } = await supabase
          .from('user_documents')
          .update({
            is_public: shouldPublish,  // Keep for backward compatibility
            document_data: {
              title: title.trim(),
              description: description.trim(),
              reviewed: 'false',
              creator_id: user.id,
              is_published: shouldPublish ? 'true' : 'false',
              published_at: shouldPublish ? new Date().toISOString() : null,
              items: validItems,
              // Channel submission fields
              creator_name: creatorName.trim() || null,
              creator_link: creatorLink.trim() || null,
              thumbnail_url: thumbnailUrl.trim() || null,
              hashtags: hashtags.length > 0 ? hashtags : null
            }
          })
          .eq('id', editingId)
          .eq('user_id', user.id)  // Security: only update own projects
          .select()
          .single();

        if (updateError) throw updateError;

        // Send emails if newly published (wasn't published before, now is)
        if (shouldPublish && !wasPublished) {
          try {
            await fetch('/api/notify-publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: editingId,
                title: title.trim(),
                description: description.trim(),
                itemCount: validItems.length,
                userId: user.id,
                userEmail: user.email
              })
            });
          } catch (err) {
            // Silent fail - don't block user workflow
            console.error('Failed to send publish notification:', err);
          }
        }

        if (shouldPublish) {
          setPublishedUrl(`https://recursive.eco/view/${editingId}`);
          setIsPublished(true);
        } else {
          setPublishedUrl(null);
          setIsPublished(false);
        }

        setSuccess(true);
        setHasUnsavedChanges(false); // Clear unsaved flag after successful save
        localStorage.removeItem('sequence-draft'); // Clear draft after successful save

        // Show success modal if published (but not for silent saves)
        if (shouldPublish && !silentSave) {
          setShowSuccessModal(true);
        }
      } else {
        // CREATE MODE: Insert new project
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}`;

        const { data: insertData, error: insertError } = await supabase
          .from('user_documents')
          .insert({
            user_id: user.id,
            document_type: 'creative_work',
            tool_slug: 'sequence',
            story_slug: slug,
            is_public: shouldPublish,
            document_data: {
              title: title.trim(),
              description: description.trim(),
              reviewed: 'false',
              creator_id: user.id,
              is_published: shouldPublish ? 'true' : 'false',
              published_at: shouldPublish ? new Date().toISOString() : null,
              items: validItems,
              // Channel submission fields
              creator_name: creatorName.trim() || null,
              creator_link: creatorLink.trim() || null,
              thumbnail_url: thumbnailUrl.trim() || null,
              hashtags: hashtags.length > 0 ? hashtags : null
            }
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (!insertData || !insertData.id) {
          throw new Error('Failed to create project: No ID returned');
        }

        // Send emails if published
        if (shouldPublish) {
          try {
            await fetch('/api/notify-publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: insertData.id,
                title: title.trim(),
                description: description.trim(),
                itemCount: validItems.length,
                userId: user.id,
                userEmail: user.email
              })
            });
          } catch (err) {
            // Silent fail - don't block user workflow
            console.error('Failed to send publish notification:', err);
          }

          setPublishedUrl(`https://recursive.eco/view/${insertData.id}`);
          setPublishedDocId(insertData.id);
          setIsPublished(true);
        } else {
          setIsPublished(false);
        }

        setSuccess(true);
        setHasUnsavedChanges(false); // Clear unsaved flag after successful save
        localStorage.removeItem('sequence-draft'); // Clear draft after successful save

        // Show success modal if published (but not for silent saves)
        if (shouldPublish && !silentSave) {
          setShowSuccessModal(true);
        }

        // Transition to edit mode
        router.push(`/dashboard/sequences/new?id=${insertData.id}`);
      }
    } catch (err) {
      console.error('Error saving project:', err);
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Filter out items with empty content
    const validItems = items.filter(item => {
      if (item.type === 'image') {
        return item.image_url && item.image_url.trim() !== '';
      } else {
        return item.video_id && item.video_id.trim() !== '';
      }
    });

    if (validItems.length === 0) {
      setError('At least one item with content is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Always create new project (ignore editingId)
      const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const timestamp = Date.now();
      const slug = `${baseSlug}-${timestamp}`;

      const { data: insertData, error: insertError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          document_type: 'creative_work',
          tool_slug: 'sequence',
          story_slug: slug,
          is_public: false,  // Start as unpublished
          document_data: {
            title: title.trim(),
            description: description.trim(),
            is_published: 'false',  // Fixed: was 'is_active'
            reviewed: 'false',
            creator_id: user.id,
            items: validItems,
            // Preserve channel submission fields
            creator_name: creatorName.trim() || null,
            creator_link: creatorLink.trim() || null,
            thumbnail_url: thumbnailUrl.trim() || null,
            hashtags: hashtags.length > 0 ? hashtags : null
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setHasUnsavedChanges(false);
      localStorage.removeItem('sequence-draft'); // Clear draft after successful save
      // Redirect to edit the new project (editingId will be set from URL params)
      router.push(`/dashboard/sequences/new?id=${insertData.id}`);
    } catch (err) {
      console.error('Error saving as new project:', err);
      setError(err instanceof Error ? err.message : 'Failed to save as new project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Floating Save Button - Centered on mobile, right on desktop */}
      {hasUnsavedChanges && !saving && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 animate-pulse">
          <button
            onClick={() => handleSaveDraft(undefined, true)}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg font-semibold transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Changes
          </button>
        </div>
      )}

      {/* Floating Expand/Collapse Button */}
      {items.length > 2 && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={handleToggleExpand}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg font-semibold transition-all hover:scale-105"
          >
            {itemsExpanded ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Collapse Items
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Expand All ({items.length})
              </>
            )}
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Metadata */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Project"
                />
              </div>

              {/* Collapsible Details Section */}
              <div className="border border-gray-700 rounded-lg">
                <button
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/50 transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <span>📝</span>
                    Description & Optional Details
                    {(description || creatorName || creatorLink || thumbnailUrl || hashtags.length > 0) && (
                      <span className="text-xs text-green-400">(has content)</span>
                    )}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {detailsExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="A brief description..."
                      />
                    </div>

                    {/* Optional Fields Info */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                      <p className="text-xs text-blue-300">
                        💡 These fields are optional but helpful when submitting to community channels.
                      </p>
                    </div>

                    {/* Creator Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Creator Display Name
                      </label>
                      <input
                        type="text"
                        value={creatorName}
                        onChange={(e) => setCreatorName(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="How you'd like to be credited"
                      />
                    </div>

                    {/* Creator Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Creator Link (optional)
                      </label>
                      <input
                        type="url"
                        value={creatorLink}
                        onChange={(e) => setCreatorLink(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://your-website.com"
                      />
                    </div>

                    {/* Thumbnail URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Thumbnail URL (optional)
                      </label>
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://drive.google.com/... or image URL"
                      />
                      {thumbnailUrl && (
                        <div className="mt-2">
                          <img
                            src={`/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}`}
                            alt="Thumbnail preview"
                            className="h-20 w-auto rounded border border-gray-600"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Hashtags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Hashtags (1-5 recommended for channels)
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={hashtagInput}
                          onChange={(e) => setHashtagInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hashtagInput.trim() && hashtags.length < 5) {
                              e.preventDefault();
                              setHashtags([...hashtags, hashtagInput.trim().toLowerCase()]);
                              setHashtagInput('');
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Type and press Enter"
                          disabled={hashtags.length >= 5}
                        />
                        <button
                          onClick={() => {
                            if (hashtagInput.trim() && hashtags.length < 5) {
                              setHashtags([...hashtags, hashtagInput.trim().toLowerCase()]);
                              setHashtagInput('');
                            }
                          }}
                          disabled={!hashtagInput.trim() || hashtags.length >= 5}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {hashtags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-sm"
                            >
                              #{tag}
                              <button
                                onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                                className="ml-1 text-purple-400 hover:text-white"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Import/Export Content Buttons */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Import / Export</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowImportLinksModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                📋 Import Links
              </button>
              <button
                onClick={handleExportLinks}
                disabled={items.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                📤 Export Links
              </button>
              <button
                onClick={() => {
                  if (items.length === 0) return;
                  if (confirm(`Delete all ${items.length} items? This cannot be undone.`)) {
                    setItems([]);
                    setError(`✅ Deleted all items`);
                  }
                }}
                disabled={items.length === 0}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                🗑️ Delete All
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                📁 Import Folder
              </button>
              <button
                onClick={() => setShowPlaylistModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                🎬 Import Playlist
              </button>
              <button
                onClick={() => setShowKidsChannelModal(true)}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
              >
                📺 YouTube Kids Channel
              </button>
            </div>
          </div>

          {/* Draggable Item Cards */}
          <div ref={itemsContainerRef} className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                Items ({items.length}/{MAX_ITEMS})
              </h2>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No items yet. Click "Import Links" to get started.
              </p>
            ) : (
              <div className={itemsExpanded ? '' : 'max-h-[400px] overflow-hidden'}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((_, i) => i.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {(itemsExpanded ? items : items.slice(0, 2)).map((item, index) => (
                      <SortableItemCard
                        key={index}
                        id={index.toString()}
                        item={item}
                        index={index}
                        onDelete={() => handleDeleteItem(index)}
                        onEditTitle={(newTitle) => handleEditItemTitle(index, newTitle)}
                        onPositionClick={() => handlePositionClick(index)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {!itemsExpanded && items.length > 2 && (
                  <div className="text-center mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-3">
                      {items.length - 2} more item{items.length - 2 !== 1 ? 's' : ''} hidden
                    </p>
                    <button
                      onClick={handleToggleExpand}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Expand All ({items.length})
                    </button>
                  </div>
                )}

                {itemsExpanded && items.length > 2 && (
                  <div className="text-center mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={handleToggleExpand}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Collapse Items
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Warning message for reported content */}
            {isReported && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-red-200 mb-3 flex items-center gap-2">
                  <span>⚠️</span> Content Reported
                </h3>
                <p className="text-red-200 mb-3">
                  This content has been reported by a viewer and cannot be published until reviewed by an administrator.
                </p>
                <p className="text-red-200 text-sm">
                  If you believe this was done in error, please email{' '}
                  <a
                    href="mailto:pp@playfulprocess.com"
                    className="text-red-300 hover:text-red-100 underline font-semibold"
                  >
                    pp@playfulprocess.com
                  </a>
                  {' '}to appeal.
                </p>
              </div>
            )}

            {/* License Agreement - Show before publishing */}
            {!isPublished && !isReported && (
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  📖 Publishing Your Content
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  When you publish, content will be attributed as follows:
                </p>
                <ul className="text-gray-300 text-sm mb-4 space-y-2 list-disc list-inside">
                  <li><strong>YouTube videos</strong> remain under their original creators' licenses (you're curating, not claiming ownership)</li>
                  <li><strong>Images with visible attribution/license</strong> remain under their specified license</li>
                  <li><strong>All other content</strong> (your original images, text, narration) will be licensed under{' '}
                    <a
                      href="https://creativecommons.org/licenses/by-sa/4.0/"
                      target="_blank"
                      rel="noopener"
                      className="text-purple-400 hover:text-purple-300 underline font-semibold"
                    >
                      Creative Commons BY-SA 4.0
                    </a>
                  </li>
                </ul>
                <p className="text-gray-300 text-sm mb-4 italic">
                  Without direct attribution to YouTube or another license on the content itself, content will be assumed to be published under Creative Commons BY-SA 4.0.
                </p>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={licenseAgreed}
                    onChange={(e) => setLicenseAgreed(e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">
                    I confirm that all content not coming from YouTube or specifically attributed under another license can be published under CC BY-SA 4.0. I own or have permission to use all such content.
                    I have read the{' '}
                    <a
                      href="https://recursive.eco/pages/about.html#terms"
                      target="_blank"
                      rel="noopener"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      Terms of Use
                    </a>.
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => handleSaveDraft()}  // Preserve current publish state
                disabled={saving || items.length === 0}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Save Draft')}
              </button>

              <button
                onClick={() => handleSaveDraft(true)}  // Force to published mode
                disabled={saving || !title.trim() || items.length === 0 || !licenseAgreed || isReported}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Publishing...' : (editingId && isPublished ? 'Update Published' : '🌐 Publish')}
              </button>

              {editingId && (
                <button
                  onClick={handleSaveAsNew}
                  disabled={saving || items.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save As New
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Draft = Private | Publish = Public URL at https://recursive.eco/view/...
            </p>

            {/* Messages section - AFTER buttons */}
            {success && !publishedUrl && (
              <div className="mt-6 bg-green-900/50 border border-green-700 rounded-lg p-4">
                <p className="text-green-200">
                  {editingId ? 'Project updated successfully!' : 'Project created successfully!'}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}
          </div>

          {/* Live Preview */}
          {items.length > 0 && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Live Preview</h2>
              <div className="rounded-lg overflow-hidden" style={{ height: '80vh' }}>
                <SequenceViewer
                  title={title || 'Untitled Project'}
                  description={description}
                  items={items}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Import Links Modal (Bulk URL Import) */}
      {showImportLinksModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Import Links</h3>
              <button
                onClick={() => {
                  setShowImportLinksModal(false);
                  setModalBulkUrls('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paste URLs (one per line or comma-separated)
                </label>
                <textarea
                  value={modalBulkUrls}
                  onChange={(e) => setModalBulkUrls(e.target.value)}
                  placeholder="https://youtube.com/watch?v=VIDEO_ID&#10;https://drive.google.com/file/d/FILE_ID/view&#10;https://i.imgur.com/image.jpg"
                  className="w-full h-64 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  💡 Supports YouTube videos, Google Drive images/videos, and direct image URLs
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportLinksModal(false);
                    setModalBulkUrls('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportFromModal}
                  disabled={!modalBulkUrls.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Appears after publishing */}
      {showSuccessModal && publishedUrl && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full p-8 border border-green-500/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-green-400 flex items-center gap-3">
                <span>🎉</span>
                Published Successfully!
              </h3>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Published URL */}
            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-3">Your content is now live at:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publishedUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publishedUrl);
                    alert('Link copied!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  title="Copy link"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-center transition-colors"
              >
                🔗 View Published Content
              </a>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowChannelSelectModal(true);
                }}
                className="block w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                📢 Submit to Channel →
              </button>

              <p className="text-xs text-gray-400 text-center mt-2">
                Submit to channels.recursive.eco to share with the community
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Position Change Modal */}
      {showPositionModal && selectedItemIndex !== null && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎯</span>
                Move Item
              </h3>
              <button
                onClick={() => {
                  setShowPositionModal(false);
                  setSelectedItemIndex(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-4">
                Current position: <span className="font-bold text-purple-400">#{selectedItemIndex + 1}</span> of {items.length}
              </p>

              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Position
              </label>
              <input
                type="number"
                min="1"
                max={items.length}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter position (1-{items.length})"
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => handleMoveToPosition(1)}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>⬆️</span>
                Move to Beginning
              </button>

              <button
                onClick={() => handleMoveToPosition(items.length)}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>⬇️</span>
                Move to End
              </button>

              <button
                onClick={() => {
                  const pos = parseInt(newPosition);
                  if (!isNaN(pos)) {
                    handleMoveToPosition(pos);
                  }
                }}
                disabled={!newPosition || parseInt(newPosition) < 1 || parseInt(newPosition) > items.length}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>↔️</span>
                Move to Position {newPosition || '...'}
              </button>
            </div>

            <button
              onClick={() => {
                setShowPositionModal(false);
                setSelectedItemIndex(null);
              }}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Drive Folder Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Import from Drive Folder</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setFolderUrl('');
                  setImportError(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Google Drive Folder URL
                </label>
                <input
                  type="text"
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  ⚠️ Folder must be set to "Anyone with link can view"
                </p>
              </div>

              {importError && (
                <div className="px-4 py-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {importError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setFolderUrl('');
                    setImportError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportDriveFolder}
                  disabled={importing || !folderUrl.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? 'Importing...' : 'Import Files'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import YouTube Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Import YouTube Playlist</h3>
              <button
                onClick={() => {
                  setShowPlaylistModal(false);
                  setPlaylistUrl('');
                  setPlaylistError(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  YouTube Playlist URL
                </label>
                <input
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://youtube.com/playlist?list=PLxxx..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  Paste a YouTube playlist URL to import all videos (max 50)
                </p>
              </div>

              {playlistError && (
                <div className="px-4 py-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {playlistError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPlaylistModal(false);
                    setPlaylistUrl('');
                    setPlaylistError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportPlaylist}
                  disabled={importingPlaylist || !playlistUrl.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importingPlaylist ? 'Importing...' : 'Import Videos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel Selection Modal */}
      {showChannelSelectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Select a Channel</h3>
              <button
                onClick={() => setShowChannelSelectModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              Choose which community channel to submit your content to:
            </p>

            <div className="space-y-3">
              {AVAILABLE_CHANNELS.map((channel) => {
                // Build URL with all submission fields
                const params = new URLSearchParams();
                params.set('doc_id', publishedDocId || '');
                params.set('channel', channel.id);
                params.set('title', title);
                if (description) params.set('description', description);
                if (creatorName) params.set('creator_name', creatorName);
                if (creatorLink) params.set('creator_link', creatorLink);
                if (thumbnailUrl) params.set('thumbnail_url', thumbnailUrl);
                if (hashtags.length > 0) params.set('hashtags', hashtags.join(','));

                return (
                  <a
                    key={channel.id}
                    href={`https://channels.recursive.eco/channels/${channel.id}?${params.toString()}`}
                    target="_blank"
                    rel="noopener"
                    onClick={() => setShowChannelSelectModal(false)}
                    className="block w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-purple-500 transition-all"
                  >
                    <h4 className="font-semibold text-white mb-1">{channel.name}</h4>
                    <p className="text-sm text-gray-400">{channel.description}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Import YouTube Kids Channel Modal */}
      {showKidsChannelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Import YouTube Kids Channel</h3>
              <button
                onClick={() => {
                  setShowKidsChannelModal(false);
                  setKidsChannelUrl('');
                  setKidsChannelError(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  YouTube Kids Channel URL
                </label>
                <input
                  type="text"
                  value={kidsChannelUrl}
                  onChange={(e) => setKidsChannelUrl(e.target.value)}
                  placeholder="https://www.youtubekids.com/channel/UC..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  Paste a YouTube Kids channel URL to import all videos (max 50)
                </p>
              </div>

              {kidsChannelError && (
                <div className="px-4 py-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {kidsChannelError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowKidsChannelModal(false);
                    setKidsChannelUrl('');
                    setKidsChannelError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportKidsChannel}
                  disabled={importingKidsChannel || !kidsChannelUrl.trim()}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importingKidsChannel ? 'Importing...' : 'Import Videos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewSequencePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <NewSequencePageContent />
    </Suspense>
  );
}
