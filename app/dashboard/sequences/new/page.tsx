'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

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

      if (data.document_data.items && data.document_data.items.length > 0) {
        setItems(data.document_data.items);
      }
    } catch (err) {
      console.error('Error loading sequence:', err);
      setError('Failed to load sequence');
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

  const handleAddImage = () => {
    if (items.length >= MAX_ITEMS) {
      setError(`Maximum ${MAX_ITEMS} items allowed`);
      return;
    }
    setItems([...items, {
      position: items.length + 1,
      type: 'image',
      image_url: '',
      alt_text: '',
      narration: ''
    }]);
    setShowAddMenu(false);
  };

  const handleAddVideo = () => {
    if (items.length >= MAX_ITEMS) {
      setError(`Maximum ${MAX_ITEMS} items allowed`);
      return;
    }
    setItems([...items, {
      position: items.length + 1,
      type: 'video',
      video_id: '',
      url: '',
      title: ''
    }]);
    setShowAddMenu(false);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => item.position = i + 1);
    setItems(newItems);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

    newItems.forEach((item, i) => item.position = i + 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'image_url') {
      item.image_url = convertGoogleDriveUrl(value);
    } else if (field === 'url') {
      item.url = value;
      item.video_id = extractYouTubeId(value);
    } else {
      (item as any)[field] = value;
    }

    setItems(newItems);
  };

  const handleSaveDraft = async () => {
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
      const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const timestamp = Date.now();
      const slug = `${baseSlug}-${timestamp}`;

      // Wrap image URLs in proxy for CORS bypass
      const proxyWrappedItems = validItems.map(item => {
        if (item.type === 'image' && item.image_url) {
          return {
            ...item,
            image_url: `/api/proxy-image?url=${encodeURIComponent(item.image_url)}`
          };
        }
        return item;
      });

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
            items: proxyWrappedItems
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setLastSavedId(insertData.id);
    } catch (err) {
      console.error('Error saving sequence:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-white">
                {editingId ? 'Edit Sequence' : 'Create Content Sequence'}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          {success && (
            <div className="mb-6 bg-green-900/50 border border-green-700 rounded-lg p-4">
              <p className="text-green-200">
                Sequence saved successfully!
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bedtime Routine Guide"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A calming sequence mixing images and videos..."
              />
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Content Items</h2>
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  disabled={items.length >= MAX_ITEMS}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  + Add Content ▼
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg z-10 border border-gray-600">
                    <button
                      onClick={handleAddImage}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 rounded-t-lg flex items-center"
                    >
                      <span className="mr-2">📷</span> Add Image
                    </button>
                    <button
                      onClick={handleAddVideo}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 rounded-b-lg flex items-center"
                    >
                      <span className="mr-2">🎥</span> Add Video
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400">
                Mix images and videos in any order. Items: {items.length}/{MAX_ITEMS}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ✨ Google Drive and YouTube links auto-convert to proper formats
              </p>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No items yet. Click "+ Add Content" to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-white font-bold">
                          {item.position}
                        </div>
                        <div className="text-center mt-1 text-xs text-gray-400">
                          {item.type === 'image' ? '📷' : '🎥'}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        {item.type === 'image' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Image URL
                              </label>
                              <input
                                type="text"
                                value={item.image_url || ''}
                                onChange={(e) => handleItemChange(index, 'image_url', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://drive.google.com/..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Alt Text (optional)
                              </label>
                              <input
                                type="text"
                                value={item.alt_text || ''}
                                onChange={(e) => handleItemChange(index, 'alt_text', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Cover page"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Narration (optional)
                              </label>
                              <textarea
                                value={item.narration || ''}
                                onChange={(e) => handleItemChange(index, 'narration', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Welcome to bedtime..."
                              />
                            </div>
                            {item.image_url && (
                              <div className="mt-3">
                                <img
                                  src={`/api/proxy-image?url=${encodeURIComponent(item.image_url)}`}
                                  alt={item.alt_text || `Item ${item.position}`}
                                  className="max-w-xs max-h-32 rounded border border-gray-600"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                YouTube URL
                              </label>
                              <input
                                type="text"
                                value={item.url || ''}
                                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://youtube.com/watch?v=..."
                              />
                              {item.video_id && item.video_id !== item.url && (
                                <p className="text-xs text-green-400 mt-1">
                                  ✓ Video ID: {item.video_id}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Title (optional)
                              </label>
                              <input
                                type="text"
                                value={item.title || ''}
                                onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Calming music"
                              />
                            </div>
                            {item.video_id && item.video_id.length === 11 && (
                              <div className="mt-3">
                                <img
                                  src={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`}
                                  alt={item.title || `Video ${item.position}`}
                                  className="max-w-xs rounded border border-gray-600"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <button
                          onClick={() => handleMoveItem(index, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 text-sm"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveItem(index, 'down')}
                          disabled={index === items.length - 1}
                          className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 text-sm"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !title.trim() || items.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Sequence'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              disabled={saving}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {lastSavedId ? 'Back to Dashboard' : 'Cancel'}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Building tools for the collective, one forge at a time. 🔨
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Mix images and videos to create rich multimedia experiences
            </p>
          </div>
        </div>
      </main>
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
