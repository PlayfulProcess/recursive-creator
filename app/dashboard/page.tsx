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
  submitted_channels?: string[];  // Added: channels where this is submitted
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
      // Fetch user's sequences
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_slug', 'sequence')
        .eq('document_type', 'creative_work')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all active channel submissions for user's sequences
      const { data: toolsData } = await supabase
        .from('tools')
        .select('tool_data, channel_id')
        .eq('tool_data->>is_active', 'true');

      // Create a map of doc_id -> { channels: string[], toolData: any }
      const toolsMap: Record<string, { channels: string[], toolData: any }> = {};
      if (toolsData) {
        for (const tool of toolsData) {
          const url = tool.tool_data?.url || '';
          // Extract doc ID from URL like https://recursive.eco/view/{doc_id}
          const match = url.match(/\/view\/([a-f0-9-]+)/i);
          if (match) {
            const docId = match[1];
            if (!toolsMap[docId]) {
              toolsMap[docId] = { channels: [], toolData: tool.tool_data };
            }
            // Get channel slug from channel_id
            const channelSlug = tool.channel_id;
            if (channelSlug && !toolsMap[docId].channels.includes(channelSlug)) {
              toolsMap[docId].channels.push(channelSlug);
            }
            // Keep the most recent tool_data (tools are fetched without order, so just use first found)
            if (!toolsMap[docId].toolData) {
              toolsMap[docId].toolData = tool.tool_data;
            }
          }
        }
      }

      // Merge tools data (priority) with user_documents data (fallback)
      const sequencesWithChannels = (data || []).map(seq => {
        const toolsInfo = toolsMap[seq.id];
        const toolData = toolsInfo?.toolData;

        // Start with user_documents values
        let title = seq.document_data.title || '';
        let description = seq.document_data.description || '';
        let creator_name = seq.document_data.creator_name || seq.document_data.author || '';
        let creator_link = seq.document_data.creator_link || '';
        let thumbnail_url = seq.document_data.thumbnail_url || '';
        let hashtags = seq.document_data.hashtags || [];

        // Override with tools table data if available (channel submission data takes priority)
        if (toolData) {
          console.log(`Merging tools data for ${seq.id}:`, toolData);
          if (toolData.name) title = toolData.name;
          if (toolData.description) description = toolData.description;
          if (toolData.submitted_by) creator_name = toolData.submitted_by;
          if (toolData.creator_link) creator_link = toolData.creator_link;
          if (toolData.thumbnail) thumbnail_url = toolData.thumbnail;
          // Note: hashtags are stored as 'category' in tools table
          const toolsHashtags = toolData.category || toolData.hashtags;
          if (toolsHashtags) {
            hashtags = Array.isArray(toolsHashtags)
              ? toolsHashtags
              : toolsHashtags.split(',').map((h: string) => h.trim());
          }
        }

        return {
          ...seq,
          document_data: {
            ...seq.document_data,
            title,
            description,
            creator_name,
            creator_link,
            thumbnail_url,
            hashtags,
          },
          submitted_channels: toolsInfo?.channels || []
        };
      });

      setSequences(sequencesWithChannels);
    } catch (err) {
      console.error('Error fetching sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  // Unsubmit from channels - sets tools.tool_data.is_active = "false"
  // This keeps the project viewable at recursive.eco/view/[id] but removes from channels
  const handleUnsubmitFromChannels = async (sequenceId: string) => {
    if (!confirm('Remove this project from all channels? It will still be viewable via its direct link.')) {
      return;
    }

    try {
      // Find all tools entries that reference this document
      // The URL format is: https://recursive.eco/view/{doc_id} or https://dev.recursive.eco/view/{doc_id}
      const { data: tools, error: fetchError } = await supabase
        .from('tools')
        .select('id, tool_data')
        .ilike('tool_data->>url', `%${sequenceId}%`);

      if (fetchError) throw fetchError;

      if (!tools || tools.length === 0) {
        alert('This project is not currently in any channels.');
        return;
      }

      // Update each tool entry to set is_active = "false"
      for (const tool of tools) {
        const { error: updateError } = await supabase
          .from('tools')
          .update({
            tool_data: {
              ...tool.tool_data,
              is_active: 'false'
            }
          })
          .eq('id', tool.id);

        if (updateError) {
          console.error('Error updating tool:', tool.id, updateError);
        }
      }

      alert(`Removed from ${tools.length} channel(s). Project is still viewable via direct link.`);

      // Refresh the list (in case we want to show channel status later)
      fetchSequences();
    } catch (err) {
      console.error('Error unsubmitting from channels:', err);
      alert('Failed to remove from channels. Please try again.');
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
      // Step 1: Unsubmit from all channels first (set tools.is_active = "false")
      // This prevents broken links in channels
      const { data: tools } = await supabase
        .from('tools')
        .select('id, tool_data')
        .ilike('tool_data->>url', `%${sequenceId}%`);

      if (tools && tools.length > 0) {
        for (const tool of tools) {
          await supabase
            .from('tools')
            .update({
              tool_data: {
                ...tool.tool_data,
                is_active: 'false'
              }
            })
            .eq('id', tool.id);
        }
        console.log(`Unsubmitted from ${tools.length} channel(s) before delete`);
      }

      // Step 2: Delete the document
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

  const handleDuplicateSequence = async (sequenceId: string) => {
    try {
      // Fetch the original sequence
      const { data: original, error: fetchError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', sequenceId)
        .eq('user_id', user!.id)
        .single();

      if (fetchError) throw fetchError;

      // Create new slug with timestamp
      const baseSlug = (original.document_data.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const timestamp = Date.now();
      const newSlug = `${baseSlug}-copy-${timestamp}`;

      // Insert duplicate (unpublished)
      const { error: insertError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user!.id,
          document_type: original.document_type,
          tool_slug: original.tool_slug,
          story_slug: newSlug,
          is_public: false,
          document_data: {
            ...original.document_data,
            title: `${original.document_data.title || 'Untitled'} (Copy)`,
            is_published: 'false',
            published_at: null
          }
        });

      if (insertError) throw insertError;

      alert('Project duplicated! The copy is saved as a draft.');
      fetchSequences();
    } catch (err) {
      console.error('Error duplicating sequence:', err);
      alert('Failed to duplicate project. Please try again.');
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
                submitted_channels={sequence.submitted_channels}
                onDelete={handleDeleteSequence}
                onUnsubmit={handleUnsubmitFromChannels}
                onPublish={handlePublishSequence}
                onDuplicate={handleDuplicateSequence}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
