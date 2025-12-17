'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import SequenceCard from '@/components/dashboard/SequenceCard';

interface SequenceItem {
  type: 'image' | 'video';
  image_url?: string;
  video_id?: string;
  title?: string;
}

interface Sequence {
  id: string;
  tool_slug: string;
  story_slug: string;
  is_public: boolean;
  document_data: {
    title: string;
    description?: string;
    reviewed: string;
    items?: SequenceItem[];
    thumbnail_url?: string;
    hashtags?: string[];
    creator_name?: string;
    creator_link?: string;
  };
  created_at: string;
}

export default function DashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (user) {
      fetchSequences();
    }
  }, [user]);

  const fetchSequences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_slug', 'sequence')
        .eq('document_type', 'creative_work')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSequences(data || []);
    } catch (err) {
      console.error('Error fetching sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublishSequence = async (sequenceId: string) => {
    if (!confirm('Unpublish this project? It will no longer be visible in channels or via public link.')) {
      return;
    }

    try {
      // First fetch the current document to get document_data
      const { data: doc, error: fetchError } = await supabase
        .from('user_documents')
        .select('document_data')
        .eq('id', sequenceId)
        .eq('user_id', user!.id)
        .single();

      if (fetchError) throw fetchError;

      // Update both is_public column AND document_data.is_published
      const { error } = await supabase
        .from('user_documents')
        .update({
          is_public: false,
          document_data: {
            ...doc.document_data,
            is_published: 'false'
          }
        })
        .eq('id', sequenceId)
        .eq('user_id', user!.id);

      if (error) throw error;

      // Refresh the list
      fetchSequences();
    } catch (err) {
      console.error('Error unpublishing sequence:', err);
      alert('Failed to unpublish project. Please try again.');
    }
  };

  const handlePublishSequence = async (sequenceId: string) => {
    try {
      // First fetch the current document to get document_data
      const { data: doc, error: fetchError } = await supabase
        .from('user_documents')
        .select('document_data')
        .eq('id', sequenceId)
        .eq('user_id', user!.id)
        .single();

      if (fetchError) throw fetchError;

      // Update both is_public column AND document_data.is_published
      const { error } = await supabase
        .from('user_documents')
        .update({
          is_public: true,
          document_data: {
            ...doc.document_data,
            is_published: 'true'
          }
        })
        .eq('id', sequenceId)
        .eq('user_id', user!.id);

      if (error) throw error;

      // Refresh the list
      fetchSequences();
    } catch (err) {
      console.error('Error publishing sequence:', err);
      alert('Failed to publish project. Please try again.');
    }
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone. It will also be removed from any channels.')) {
      return;
    }

    try {
      // First fetch the current document to get document_data
      const { data: doc } = await supabase
        .from('user_documents')
        .select('document_data')
        .eq('id', sequenceId)
        .eq('user_id', user!.id)
        .single();

      if (doc) {
        // Unpublish first (so channels don't have broken links)
        await supabase
          .from('user_documents')
          .update({
            is_public: false,
            document_data: {
              ...doc.document_data,
              is_published: 'false'
            }
          })
          .eq('id', sequenceId)
          .eq('user_id', user!.id);
      }

      // Then delete
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', sequenceId)
        .eq('user_id', user!.id);

      if (error) throw error;

      // Refresh the list
      fetchSequences();
    } catch (err) {
      console.error('Error deleting sequence:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Projects</h1>
            <p className="text-gray-400 mt-1">Create and manage your content sequences</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/sequences/new')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Project
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-400">Loading projects...</div>
          </div>
        ) : sequences.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first project to mix images and videos into beautiful content sequences.
            </p>
            <button
              onClick={() => router.push('/dashboard/sequences/new')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sequences.map((sequence) => (
              <SequenceCard
                key={sequence.id}
                id={sequence.id}
                title={sequence.document_data.title}
                description={sequence.document_data.description}
                thumbnail_url={sequence.document_data.thumbnail_url}
                items={sequence.document_data.items}
                items_count={sequence.document_data.items?.length || 0}
                is_published={sequence.is_public}
                is_reviewed={sequence.document_data.reviewed === 'true'}
                created_at={sequence.created_at}
                hashtags={sequence.document_data.hashtags}
                creator_name={sequence.document_data.creator_name}
                creator_link={sequence.document_data.creator_link}
                onDelete={handleDeleteSequence}
                onUnpublish={handleUnpublishSequence}
                onPublish={handlePublishSequence}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
