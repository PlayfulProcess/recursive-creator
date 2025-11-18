'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import SequenceViewer from '@/components/viewers/SequenceViewer';

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
}

function NewSequencePageContent() {
  const { user, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editingId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<SequenceItem[]>([]);
  const [bulkUrls, setBulkUrls] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // Drive folder import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [folderUrl, setFolderUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Load sequence data when editing
  useEffect(() => {
    if (editingId && user) {
      loadSequence(editingId);
    }
  }, [editingId, user]);

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

      // Check if published (from document_data.is_published)
      const isPublishedValue = data.document_data.is_published === 'true';
      setIsPublished(isPublishedValue);

      // Set published URL if published
      if (isPublishedValue) {
        setPublishedUrl(`https://recursive.eco/view/${id}`);
      } else {
        setPublishedUrl(null);
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

        // Populate bulkUrls textarea with existing URLs
        const urlList = cleanedItems.map((item: SequenceItem) => {
          if (item.type === 'video') {
            // Check if it's Drive video (longer ID) or YouTube (11 chars)
            if (item.video_id && item.video_id.length > 11) {
              // Drive video
              return `video: https://drive.google.com/file/d/${item.video_id}/view`;
            } else if (item.url) {
              // YouTube - use original URL if available
              return item.url;
            } else {
              // YouTube - reconstruct from ID
              return `https://youtube.com/watch?v=${item.video_id}`;
            }
          } else {
            // Image
            return item.image_url || '';
          }
        }).filter((url: string) => url.trim() !== '');

        setBulkUrls(urlList.join('\n'));
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

  const handleParseBulkUrls = () => {
    if (!bulkUrls.trim()) {
      // Empty textarea = clear all items
      setItems([]);
      setError(null);
      return;
    }

    const lines = bulkUrls.split(/[\n,]+/).filter(line => line.trim());

    if (lines.length > MAX_ITEMS) {
      setError(`Maximum ${MAX_ITEMS} items allowed. You have ${lines.length} URLs.`);
      return;
    }

    const newItems: SequenceItem[] = [];

    lines.forEach((line, index) => {
      const { type, processedUrl } = detectUrlType(line);

      if (type === 'video') {
        // Check if it's YouTube or Drive
        if (processedUrl.includes('youtube.com') || processedUrl.includes('youtu.be')) {
          const videoId = extractYouTubeId(processedUrl);
          newItems.push({
            position: index + 1,
            type: 'video',
            video_id: videoId,
            url: processedUrl,
            title: ''
          });
        } else if (processedUrl.includes('drive.google.com')) {
          // Drive video
          const driveId = convertGoogleDriveVideoUrl(processedUrl);
          newItems.push({
            position: index + 1,
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
          position: index + 1,
          type: 'image',
          image_url: convertedUrl,
          alt_text: '',
          narration: ''
        });
      }
    });

    // REPLACE items completely (don't add to existing)
    setItems(newItems);
    setError(null);
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

      // Auto-populate bulk textarea with imported URLs
      setBulkUrls(data.urls.join('\n'));

      // Close modal
      setShowImportModal(false);
      setFolderUrl('');

      // Show success message
      setError(`✅ Imported ${data.count} files! Click "Update Sidebar" to add them.`);

    } catch (err: any) {
      setImportError(err.message || 'Failed to import folder');
    } finally {
      setImporting(false);
    }
  };

  const handleReorderItem = (currentIndex: number, newPosition: number) => {
    const pos = parseInt(String(newPosition));

    // Validate
    if (isNaN(pos) || pos < 1 || pos > items.length) {
      return;
    }

    // Same position, no change
    if (pos === currentIndex + 1) {
      return;
    }

    // Reorder: remove from old position, insert at new position
    const newItems = [...items];
    const [movedItem] = newItems.splice(currentIndex, 1);
    newItems.splice(pos - 1, 0, movedItem);

    // Renumber all items
    newItems.forEach((item, i) => item.position = i + 1);
    setItems(newItems);
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

  const handleSaveDraft = async (forcePublished?: boolean) => {
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
              is_published: shouldPublish ? 'true' : 'false',  // ✅ Add this for view.html
              published_at: shouldPublish ? new Date().toISOString() : null,
              items: validItems  // Save raw URLs, no proxy wrapping
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
            is_public: shouldPublish,  // Keep for backward compatibility
            document_data: {
              title: title.trim(),
              description: description.trim(),
              reviewed: 'false',
              creator_id: user.id,
              is_published: shouldPublish ? 'true' : 'false',  // ✅ Add this for view.html
              published_at: shouldPublish ? new Date().toISOString() : null,
              items: validItems  // Save raw URLs, no proxy wrapping
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
          setIsPublished(true);
        } else {
          setIsPublished(false);
        }

        setSuccess(true);
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
          document_data: {
            title: title.trim(),
            description: description.trim(),
            is_active: 'false',
            reviewed: 'false',
            creator_id: user.id,
            items: validItems
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      // Redirect to edit the new project
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Metadata */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            {success && publishedUrl && (
              <div className="mb-6 bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h3 className="text-green-400 font-semibold mb-2">
                  ✅ Project Published!
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Your project is now live. Share this link:
                </p>
                <div className="flex items-center gap-2 mb-3">
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
                      alert('Link copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    📋 Copy
                  </button>
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    🔗 View
                  </a>
                </div>
                <p className="text-xs text-gray-500">
                  ⚠️ This link is public. Anyone with it can view your project.
                </p>
              </div>
            )}

            {success && !publishedUrl && (
              <div className="mb-6 bg-green-900/50 border border-green-700 rounded-lg p-4">
                <p className="text-green-200">
                  {editingId ? 'Project updated successfully!' : 'Project created successfully!'}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}

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
            </div>
          </div>

          {/* Main Content Area - Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Bulk URL Input */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Add Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Paste URLs (one per line or comma-separated)
                  </label>
                  <div className="border border-gray-600 rounded-lg bg-gray-700">
                    {/* Table-like layout: Line# | Filename | URL */}
                    <div className="h-[40vh] overflow-y-auto">
                      <div className="flex flex-col font-mono text-sm">
                        {bulkUrls.split('\n').map((line, i) => {
                          // Extract filename from URL
                          let fileName = '';
                          if (line.trim()) {
                            try {
                              // Remove "video:" prefix if present
                              const cleanLine = line.replace(/^video:\s*/i, '').trim();

                              // Try to extract filename
                              if (cleanLine.includes('drive.google.com')) {
                                // Try to extract file ID and use as identifier
                                const idMatch = cleanLine.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                fileName = idMatch ? `Drive: ${idMatch[1].substring(0, 8)}...` : 'Drive file';
                              } else if (cleanLine.includes('youtube.com') || cleanLine.includes('youtu.be')) {
                                // For YouTube, show video ID
                                const videoIdMatch = cleanLine.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                fileName = videoIdMatch ? `YT: ${videoIdMatch[1]}` : 'YouTube';
                              } else {
                                // Try to get filename from URL
                                const urlParts = cleanLine.split('/');
                                const lastPart = urlParts[urlParts.length - 1];
                                if (lastPart) {
                                  // Remove query params and decode
                                  fileName = decodeURIComponent(lastPart.split('?')[0]);
                                  // Truncate if too long
                                  if (fileName.length > 25) {
                                    fileName = fileName.substring(0, 22) + '...';
                                  }
                                }
                              }
                            } catch (e) {
                              fileName = 'File';
                            }
                          }

                          return (
                            <div
                              key={i}
                              className="flex items-stretch border-b border-gray-600 hover:bg-gray-600/30 transition-colors"
                            >
                              {/* Line number */}
                              <div className="flex-shrink-0 w-10 px-2 py-1 bg-gray-800 text-gray-500 text-right border-r border-gray-600">
                                {i + 1}
                              </div>

                              {/* Filename */}
                              <div className="flex-shrink-0 w-48 px-3 py-1 text-gray-300 border-r border-gray-600 truncate" title={fileName}>
                                {fileName || <span className="text-gray-600">empty</span>}
                              </div>

                              {/* URL (editable) */}
                              <input
                                type="text"
                                value={line}
                                onChange={(e) => {
                                  const lines = bulkUrls.split('\n');
                                  lines[i] = e.target.value;
                                  setBulkUrls(lines.join('\n'));
                                }}
                                className="flex-1 px-3 py-1 bg-transparent text-white focus:outline-none focus:bg-gray-600/30"
                                placeholder="Paste URL here..."
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ✨ Auto-detects YouTube videos. Drive defaults to images. Prefix with <code className="bg-gray-600 px-1 rounded">video:</code> for Drive videos.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleParseBulkUrls}
                    disabled={!bulkUrls.trim() || items.length >= MAX_ITEMS}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Update Sidebar →
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                    title="Import all files from a Drive folder"
                  >
                    📁 Import Folder
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Scrollable Sidebar with Items */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Items ({items.length}/{MAX_ITEMS})
              </h2>

              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">No items yet</p>
                  <p className="text-xs mt-1">Paste URLs to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-700 rounded-lg p-3 border border-gray-600"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {/* Number Input */}
                        <input
                          type="number"
                          min="1"
                          max={items.length}
                          value={item.position}
                          onChange={(e) => handleReorderItem(index, parseInt(e.target.value))}
                          className="w-14 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Type Icon */}
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-lg">{item.type === 'image' ? '📷' : '🎥'}</span>
                        </div>

                        {/* File Name/Title Preview */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 truncate" title={item.type === 'image' ? item.image_url : item.url}>
                            {item.type === 'image' && item.alt_text
                              ? item.alt_text
                              : item.type === 'video' && item.title
                                ? item.title
                                : item.type === 'image' && item.image_url
                                  ? (item.image_url.includes('drive.google.com') ? 'Drive Image' : 'Image')
                                  : item.type === 'video' && item.video_id
                                    ? `Video: ${item.video_id.substring(0, 8)}`
                                    : 'Item'
                            }
                          </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="flex-shrink-0 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          ×
                        </button>
                      </div>

                      {/* Thumbnail */}
                      {item.type === 'image' && item.image_url && (
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(item.image_url)}`}
                          alt={item.alt_text || `Item ${item.position}`}
                          className="w-full h-20 object-contain rounded border border-gray-600 mb-2 bg-gray-700"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {item.type === 'video' && item.video_id && item.video_id.length === 11 && (
                        <img
                          src={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`}
                          alt={item.title || `Video ${item.position}`}
                          className="w-full h-20 object-contain rounded border border-gray-600 mb-2 bg-gray-700"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}

                      {/* Quick Edit Fields */}
                      {item.type === 'image' && (
                        <input
                          type="text"
                          value={item.alt_text || ''}
                          onChange={(e) => handleItemChange(index, 'alt_text', e.target.value)}
                          placeholder="Alt text (optional)"
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                      {item.type === 'video' && (
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                          placeholder="Title (optional)"
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex gap-4">
              <button
                onClick={() => handleSaveDraft(false)}  // Force to draft mode
                disabled={saving || !title.trim() || items.length === 0}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : (editingId ? 'Save as Draft' : 'Save Draft')}
              </button>

              <button
                onClick={() => handleSaveDraft(true)}  // Force to published mode
                disabled={saving || !title.trim() || items.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Publishing...' : '🌐 Publish Project'}
              </button>

              {editingId && (
                <button
                  onClick={handleSaveAsNew}
                  disabled={saving || !title.trim() || items.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save As New
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Draft = Private | Publish = Public URL at https://recursive.eco/view/...
            </p>
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
