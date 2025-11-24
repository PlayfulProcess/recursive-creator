import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { playlistUrl } = await request.json();

    if (!playlistUrl) {
      return NextResponse.json(
        { error: 'Playlist URL is required' },
        { status: 400 }
      );
    }

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid YouTube playlist URL. Please check the URL and try again.' },
        { status: 400 }
      );
    }

    // Use YouTube Data API v3 to fetch all videos in playlist
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_DRIVE_API_KEY not configured');
      return NextResponse.json(
        { error: 'YouTube API not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?` +
      `part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API error:', errorData);

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'API quota exceeded or playlist is private. Please try again later.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch playlist from YouTube. Please check if the playlist is public.' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Playlist is empty or not found.' },
        { status: 404 }
      );
    }

    // Extract video IDs and titles
    const videos = data.items.map((item: any) => ({
      video_id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      url: `https://youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      thumbnail: item.snippet.thumbnails?.default?.url || ''
    }));

    return NextResponse.json({
      videos,
      count: videos.length,
      playlistTitle: data.items[0]?.snippet?.channelTitle || 'YouTube Playlist'
    });

  } catch (error) {
    console.error('Playlist extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract playlist. Please try again.' },
      { status: 500 }
    );
  }
}

function extractPlaylistId(url: string): string | null {
  // Handle various YouTube playlist URL formats
  const patterns = [
    /[?&]list=([^&]+)/,           // ?list=PLxxx or &list=PLxxx
    /\/playlist\?list=([^&]+)/,   // /playlist?list=PLxxx
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it looks like a playlist ID directly (starts with PL)
  if (url.match(/^PL[a-zA-Z0-9_-]+$/)) {
    return url;
  }

  return null;
}
