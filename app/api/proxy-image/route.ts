import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge runtime for better performance

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security: Only allow specific domains
  const allowedDomains = [
    'drive.google.com',
    'lh3.googleusercontent.com',
    'supabase.co',
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const isAllowed = allowedDomains.some(domain =>
    parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Domain not allowed' },
      { status: 403 }
    );
  }

  try {
    // Fetch the image from the external source
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with CORS headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
