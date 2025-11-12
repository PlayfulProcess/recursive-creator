'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const MAX_PAGES = 50; // Security limit

interface Page {
  page_number: number;
  image_url: string;
}

function NewStoryPageContent() {
  const { user, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editingId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState<Page[]>([{ page_number: 1, image_url: '' }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Load story data when editing
  useEffect(() => {
    if (editingId && user) {
      loadStory(editingId);
    }
  }, [editingId, user]);

  const loadStory = async (id: string) => {
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
      setSubtitle(data.document_data.subtitle || '');
      setAuthor(data.document_data.author || '');

      if (data.document_data.pages && data.document_data.pages.length > 0) {
        setPages(data.document_data.pages);
      }
    } catch (err) {
      console.error('Error loading story:', err);
      setError('Failed to load story');
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

  const handleAddPage = () => {
    if (pages.length >= MAX_PAGES) {
      setError(`Maximum ${MAX_PAGES} pages allowed`);
      return;
    }
    setPages([...pages, { page_number: pages.length + 1, image_url: '' }]);
  };

  const handleRemovePage = (index: number) => {
    if (pages.length === 1) return; // Keep at least one page
    const newPages = pages.filter((_, i) => i !== index);
    // Renumber pages
    newPages.forEach((page, i) => page.page_number = i + 1);
    setPages(newPages);
  };

  const convertGoogleDriveUrl = (url: string): string => {
    // Detect and convert Google Drive URLs to direct image URLs
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([^\/]+)/,  // /file/d/FILE_ID/view
      /drive\.google\.com\/open\?id=([^&]+)/,   // /open?id=FILE_ID
    ];

    for (const pattern of drivePatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Use Google's direct image CDN (more reliable for CORS)
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }

    return url; // Return original if not a Drive URL
  };

  const handlePageUrlChange = (index: number, url: string) => {
    const newPages = [...pages];
    // Auto-convert Google Drive URLs
    newPages[index].image_url = convertGoogleDriveUrl(url);
    setPages(newPages);
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pages.length - 1) return;

    const newPages = [...pages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];

    // Renumber
    newPages.forEach((page, i) => page.page_number = i + 1);
    setPages(newPages);
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Filter out pages with empty URLs
    const validPages = pages.filter(p => p.image_url.trim() !== '');
    if (validPages.length === 0) {
      setError('At least one page with an image URL is required');
      return;
    }

    // Wrap image URLs in proxy for CORS bypass
    const proxyWrappedPages = validPages.map(page => ({
      ...page,
      image_url: `https://creator.recursive.eco/api/proxy-image?url=${encodeURIComponent(page.image_url)}`
    }));

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
          document_type: 'story',
          tool_slug: 'story',
          story_slug: slug,
          document_data: {
            title: title.trim(),
            subtitle: subtitle.trim(),
            author: author.trim() || 'Anonymous',
            is_active: 'false',
            reviewed: 'false',
            creator_id: user.id,
            pages: proxyWrappedPages
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setLastSavedId(insertData.id);

      // Don't auto-redirect, let user preview or manually return
      // setTimeout(() => {
      //   router.push('/dashboard');
      // }, 1500);
    } catch (err) {
      console.error('Error saving story:', err);
      setError(err instanceof Error ? err.message : 'Failed to save story');
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
                {editingId ? 'Edit Story' : 'Create New Story'}
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
                Story saved successfully! Redirecting to dashboard...
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
                placeholder="The Nest Knows Best"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="For Little Ones Learning to Sleep"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Name"
              />
            </div>
          </div>

          {/* Pages */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Story Pages</h2>
              <button
                onClick={handleAddPage}
                disabled={pages.length >= MAX_PAGES}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                + Add Page
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400">
                Add image URLs (Google Drive, Imgur, etc.). Pages: {pages.length}/{MAX_PAGES}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ✨ Paste Google Drive sharing links - they'll auto-convert to direct image URLs
              </p>
            </div>

            <div className="space-y-4">
              {pages.map((page, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-white font-bold">
                        {page.page_number}
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={page.image_url}
                        onChange={(e) => handlePageUrlChange(index, e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/image.png"
                      />
                    </div>

                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => handleMovePage(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 text-sm"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMovePage(index, 'down')}
                        disabled={index === pages.length - 1}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 text-sm"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleRemovePage(index)}
                        disabled={pages.length === 1}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-30 text-sm"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {page.image_url && (
                    <div className="mt-3">
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(page.image_url)}`}
                        alt={`Page ${page.page_number} preview`}
                        className="max-w-xs max-h-32 rounded border border-gray-600"
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
              {saving ? 'Saving...' : 'Save New Draft'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              disabled={saving}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {lastSavedId ? 'Back to Dashboard' : 'Cancel'}
            </button>
          </div>

          {/* Preview Section */}
          {lastSavedId && (
            <div className="mt-8 border-t border-gray-700 pt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Story Preview</h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: '80vh' }}>
                <iframe
                  src={`https://dev.recursive.eco/pages/content/viewer.html?id=${lastSavedId}&type=story`}
                  className="w-full h-full border-0"
                  title="Story Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              <p className="text-gray-400 text-sm mt-4 text-center">
                This is how your story will look when published (using unified content viewer from dev.recursive.eco)
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Building tools for the collective, one forge at a time. 🔨
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Users own their data - we only store links!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewStoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <NewStoryPageContent />
    </Suspense>
  );
}
