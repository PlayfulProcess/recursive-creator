'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

interface Story {
  id: string;
  tool_slug: string;
  story_slug: string;
  document_data: {
    title: string;
    subtitle?: string;
    author: string;
    is_active: string;
    reviewed: string;
    pages?: any[];
  };
  created_at: string;
}

export default function DashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (user) {
      fetchStories();
    }
  }, [user]);

  const fetchStories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_slug', 'story')  // Filter by tool_slug first (indexed)
        .eq('document_type', 'story')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user!.id);  // Extra safety check

      if (error) throw error;

      // Refresh the list
      fetchStories();
    } catch (err) {
      console.error('Error deleting story:', err);
      alert('Failed to delete story. Please try again.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getStatusBadge = (story: Story) => {
    if (story.document_data.is_active === 'true') {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Published</span>;
    } else if (story.document_data.reviewed === 'true') {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Rejected</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stories Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Stories</h2>
            <button
              onClick={() => router.push('/dashboard/stories/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Create New Story
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600 text-sm">Loading stories...</p>
          ) : stories.length === 0 ? (
            <p className="text-gray-600 text-sm">
              You haven't created any stories yet. Click "Create New Story" to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {story.document_data.title}
                      </h3>
                      {story.document_data.subtitle && (
                        <p className="text-sm text-gray-600 mt-1">
                          {story.document_data.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-sm text-gray-500">
                          By {story.document_data.author}
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-500">
                          {story.document_data.pages?.length || 0} pages
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-500">
                          {new Date(story.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(story)}
                      <button
                        onClick={() => router.push(`/dashboard/stories/new?id=${story.id}`)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
