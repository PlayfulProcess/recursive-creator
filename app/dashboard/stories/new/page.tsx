'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

interface Page {
  id: string;
  page_number: number;
  image_url: string;
  image_file?: File;
}

interface UploadedPage {
  page_number: number;
  image_url: string;
}

export default function NewStoryPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === 'loading') {
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const newPages: Page[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Create temporary object URL for preview
        const objectUrl = URL.createObjectURL(file);

        newPages.push({
          id: `temp-${Date.now()}-${i}`,
          page_number: pages.length + i + 1,
          image_url: objectUrl,
          image_file: file
        });
      }

      setPages([...pages, ...newPages]);
    } catch (err) {
      console.error('Error adding images:', err);
      setError(err instanceof Error ? err.message : 'Failed to add images');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePage = (pageId: string) => {
    setPages(pages.filter(p => p.id !== pageId));
  };

  const handleMovePage = (pageId: string, direction: 'up' | 'down') => {
    const index = pages.findIndex(p => p.id === pageId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const newPages = [...pages];
      [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
      setPages(newPages);
    } else if (direction === 'down' && index < pages.length - 1) {
      const newPages = [...pages];
      [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
      setPages(newPages);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newPages = [...pages];
    const [draggedPage] = newPages.splice(draggedIndex, 1);
    newPages.splice(dropIndex, 0, draggedPage);

    setPages(newPages);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const uploadImagesToStorage = async (storyId: string): Promise<UploadedPage[]> => {
    const uploadedPages: UploadedPage[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      if (!page.image_file) continue;

      // Upload to Supabase Storage
      const fileExt = page.image_file.name.split('.').pop();
      const fileName = `page-${i + 1}.${fileExt}`;
      const filePath = `${user!.id}/${storyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(filePath, page.image_file, {
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-images')
        .getPublicUrl(filePath);

      uploadedPages.push({
        page_number: i + 1,
        image_url: publicUrl
      });
    }

    return uploadedPages;
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Always INSERT a new draft
      const { data: storyData, error: insertError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          document_type: 'story',
          tool_slug: 'story',  // Constant for all stories (for filtering)
          story_slug: slug,    // Unique slug for this specific story (for retrieval)
          document_data: {
            title: title.trim(),
            subtitle: subtitle.trim(),
            author: author.trim() || 'Anonymous',
            is_active: 'false',  // String! (consistent with tools)
            reviewed: 'false',
            creator_id: user.id,
            pages: []  // Will update after uploading images
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!storyData) throw new Error('Failed to create story');

      const currentStoryId = storyData.id;

      // Upload images and get page data
      let uploadedPages: UploadedPage[] = [];
      if (pages.length > 0) {
        uploadedPages = await uploadImagesToStorage(currentStoryId);

        // Update the story with page data
        const { error: updateError } = await supabase
          .from('user_documents')
          .update({
            document_data: {
              ...storyData.document_data,
              pages: uploadedPages
            }
          })
          .eq('id', currentStoryId);

        if (updateError) throw updateError;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error saving story:', err);
      setError(err instanceof Error ? err.message : 'Failed to save story');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
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
              <h1 className="text-xl font-bold text-white">Create New Story</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-900/50 border border-green-700 rounded-lg p-4">
              <p className="text-green-200">
                Story saved successfully! You can continue editing or go back to your dashboard.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Story Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Nest Knows Best: Bunny Coping Tricks"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            {/* Subtitle */}
            <div>
              <label htmlFor="subtitle" className="block text-sm font-medium text-gray-300 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="For Little Ones Learning to Sleep"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            {/* Author */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-300 mb-2">
                Author Name
              </label>
              <input
                type="text"
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name or pen name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Story Pages
              </label>
              <div className="space-y-4">
                {/* Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={saving || uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving || uploading}
                    className="w-full px-4 py-3 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? 'Processing images...' : '+ Add Images'}
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    Click to select one or more images. Drag pages to reorder them.
                  </p>
                </div>

                {/* Page List */}
                {pages.length > 0 && (
                  <div className="space-y-3">
                    {pages.map((page, index) => (
                      <div
                        key={page.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-gray-700 rounded-lg p-4 border-2 cursor-move ${
                          draggedIndex === index
                            ? 'border-blue-500 opacity-50'
                            : 'border-gray-600 hover:border-gray-500'
                        } transition-all`}
                      >
                        <div className="flex gap-4">
                          {/* Image Preview */}
                          <div className="flex-shrink-0">
                            <img
                              src={page.image_url}
                              alt={`Page ${index + 1} preview`}
                              className="w-24 h-24 object-cover rounded"
                            />
                          </div>

                          {/* Page Details */}
                          <div className="flex-grow">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">
                                Page {index + 1}
                              </span>
                              <div className="flex gap-2">
                                {/* Move Up */}
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMovePage(page.id, 'up')}
                                    className="px-3 py-2 text-xl text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                )}
                                {/* Move Down */}
                                {index < pages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMovePage(page.id, 'down')}
                                    className="px-3 py-2 text-xl text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                )}
                                {/* Remove */}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePage(page.id)}
                                  className="px-3 py-2 text-xl text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors"
                                  title="Remove page"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                <strong>How it works:</strong> Add your story details above, then upload images to create pages.
                You can reorder pages with the arrow buttons. When you're ready, save your draft.
              </p>
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
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Vulcan Note */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Building tools for the collective, one forge at a time. 🔨
          </p>
        </div>
      </main>
    </div>
  );
}

