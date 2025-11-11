'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const MAX_VIDEOS = 50; // Security limit

interface Video {
  position: number;
  video_id: string;
  url: string;
  title?: string;
}

function NewPlaylistPageContent() {
  const { user, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editingId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [videos, setVideos] = useState<Video[]>([{ position: 1, video_id: '', url: '', title: '' }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load playlist data when editing
  useEffect(() => {
    if (editingId && user) {
      loadPlaylist(editingId);
    }
  }, [editingId, user]);

  const loadPlaylist = async (id: string) => {
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
      setCategory(data.document_data.category || '');

      if (data.document_data.videos && data.document_data.videos.length > 0) {
        setVideos(data.document_data.videos);
      }
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError('Failed to load playlist');
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

  const extractYouTubeId = (url: string): string => {
    // Extract YouTube video ID from various URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url; // Return original if no match
  };

  const handleVideoUrlChange = (index: number, url: string) => {
    const newVideos = [...videos];
    const videoId = extractYouTubeId(url);
    newVideos[index].url = url;
    newVideos[index].video_id = videoId;
    setVideos(newVideos);
  };

  const handleVideoTitleChange = (index: number, title: string) => {
    const newVideos = [...videos];
    newVideos[index].title = title;
    setVideos(newVideos);
  };

  const handleAddVideo = () => {
    if (videos.length >= MAX_VIDEOS) {
      setError(`Maximum ${MAX_VIDEOS} videos allowed`);
      return;
    }
    setVideos([...videos, { position: videos.length + 1, video_id: '', url: '', title: '' }]);
  };

  const handleRemoveVideo = (index: number) => {
    if (videos.length === 1) return; // Keep at least one video
    const newVideos = videos.filter((_, i) => i !== index);
    // Renumber positions
    newVideos.forEach((video, i) => video.position = i + 1);
    setVideos(newVideos);
  };

  const handleMoveVideo = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === videos.length - 1) return;

    const newVideos = [...videos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newVideos[index], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[index]];

    // Renumber
    newVideos.forEach((video, i) => video.position = i + 1);
    setVideos(newVideos);
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Filter out videos with empty URLs
    const validVideos = videos.filter(v => v.video_id.trim() !== '');
    if (validVideos.length === 0) {
      setError('At least one video is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Create unique slug with timestamp to avoid conflicts
      const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const timestamp = Date.now();
      const slug = `${baseSlug}-${timestamp}`;

      const { data: insertData, error: insertError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          document_type: 'playlist',
          tool_slug: 'playlist',
          story_slug: slug,
          document_data: {
            title: title.trim(),
            description: description.trim(),
            category: category.trim() || 'General',
            is_active: 'false',
            reviewed: 'false',
            creator_id: user.id,
            videos: validVideos
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setLastSavedId(insertData.id);
    } catch (err) {
      console.error('Error saving playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to save playlist');
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
                {editingId ? 'Edit Playlist' : 'Create New Playlist'}
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
                Playlist saved successfully!
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
                Playlist Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bedtime Stories for Kids"
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
                placeholder="A curated collection of calming bedtime stories..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Kids, Wellness, Learning, etc."
              />
            </div>
          </div>

          {/* Videos */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Videos</h2>
              <button
                onClick={handleAddVideo}
                disabled={videos.length >= MAX_VIDEOS}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                + Add Video
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400">
                Paste YouTube video URLs. Videos: {videos.length}/{MAX_VIDEOS}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ✨ Auto-extracts video IDs from youtube.com/watch, youtu.be, or direct IDs
              </p>
            </div>

            <div className="space-y-4">
              {videos.map((video, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-white font-bold">
                        {video.position}
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          YouTube URL
                        </label>
                        <input
                          type="text"
                          value={video.url}
                          onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        {video.video_id && video.video_id !== video.url && (
                          <p className="text-xs text-green-400 mt-1">
                            ✓ Video ID: {video.video_id}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={video.title || ''}
                          onChange={(e) => handleVideoTitleChange(index, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Custom title for this video"
                        />
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => handleMoveVideo(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 text-sm"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveVideo(index, 'down')}
                        disabled={index === videos.length - 1}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 text-sm"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleRemoveVideo(index)}
                        disabled={videos.length === 1}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-30 text-sm"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Video thumbnail preview */}
                  {video.video_id && video.video_id.length === 11 && (
                    <div className="mt-3">
                      <img
                        src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                        alt={`Video ${video.position} thumbnail`}
                        className="max-w-xs rounded border border-gray-600"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !title.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Playlist'}
            </button>

            {lastSavedId && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
              >
                {showPreview ? 'Hide Preview' : 'Preview Playlist'}
              </button>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              disabled={saving}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {lastSavedId ? 'Back to Dashboard' : 'Cancel'}
            </button>
          </div>

          {/* Preview Section */}
          {showPreview && lastSavedId && (
            <div className="mt-8 border-t border-gray-700 pt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Playlist Preview</h3>
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="max-w-2xl mx-auto">
                  {/* Playlist Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
                    {description && <p className="text-lg text-gray-400 mb-2">{description}</p>}
                    {category && <p className="text-sm text-gray-500">Category: {category}</p>}
                    <p className="text-sm text-gray-500 mt-2">{videos.filter(v => v.video_id).length} videos</p>
                  </div>

                  {/* Video List */}
                  <div className="space-y-6">
                    {videos.filter(v => v.video_id.trim()).map((video, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
                        <div className="aspect-video">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube-nocookie.com/embed/${video.video_id}`}
                            title={video.title || `Video ${video.position}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        {video.title && (
                          <div className="p-4">
                            <h3 className="text-white font-medium">{video.title}</h3>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Building tools for the collective, one forge at a time. 🔨
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Privacy-enhanced YouTube embeds (youtube-nocookie.com)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewPlaylistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <NewPlaylistPageContent />
    </Suspense>
  );
}
