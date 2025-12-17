import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to extract all videos from a YouTube Kids channel
 *
 * Input: { channelUrl: string } - A YouTube Kids channel URL
 * Output: { videos: Array<{video_id, title, url, thumbnail}>, error?: string }
 *
 * Requirements:
 * - GOOGLE_DRIVE_API_KEY environment variable (same key works for YouTube Data API)
 * - Channel must be accessible (public)
 */
export async function POST(request: NextRequest) {
  try {
    const { channelUrl } = await request.json();

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }

    // Extract channel ID from YouTube Kids URL
    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      return NextResponse.json(
        { error: 'Invalid YouTube Kids channel URL. Please use a link like: https://www.youtubekids.com/channel/UC...' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured. Please add GOOGLE_DRIVE_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Convert channel ID to uploads playlist ID (UC... → UU...)
    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');

    // Fetch videos from uploads playlist using YouTube Data API v3
    const playlistApiUrl =
      `https://www.googleapis.com/youtube/v3/playlistItems?` +
      `part=snippet,contentDetails&` +
      `maxResults=50&` +
      `playlistId=${uploadsPlaylistId}&` +
      `key=${apiKey}`;

    const response = await fetch(playlistApiUrl);

    if (!response.ok) {
      const errorData = await response.json();

      // Handle common errors
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Channel not found or has no videos. Make sure the channel URL is correct.' },
          { status: 404 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. The channel may be private or the API quota may be exceeded.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `YouTube API error: ${errorData.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'No videos found in this channel.' },
        { status: 404 }
      );
    }

    // Extract video information
    const videos = data.items.map((item: any) => ({
      video_id: item.contentDetails.videoId,
      title: item.snippet.title,
      url: `https://youtube.com/watch?v=${item.contentDetails.videoId}`,
      thumbnail: item.snippet.thumbnails?.default?.url || ''
    }));

    return NextResponse.json({
      videos,
      count: videos.length
    });

  } catch (error) {
    console.error('Error extracting YouTube Kids channel:', error);
    return NextResponse.json(
      { error: 'Failed to extract channel videos. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Extract channel ID from YouTube Kids URL
 * Only accepts youtubekids.com URLs
 */
function extractChannelId(url: string): string | null {
  // Format: https://www.youtubekids.com/channel/UCRtrWCTxogJk4iN8vSjXgrg?hl=en-GB
  const youtubeKidsMatch = url.match(/youtubekids\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (youtubeKidsMatch) {
    return youtubeKidsMatch[1];
  }

  // Also accept just the channel ID if it starts with UC
  if (/^UC[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}
