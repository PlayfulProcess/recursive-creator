import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to import all image/video files from a publicly shared Google Drive folder
 *
 * Input: { folderUrl: string } - A Google Drive folder share link
 * Output: { urls: string[], error?: string }
 *
 * Requirements:
 * - GOOGLE_DRIVE_API_KEY environment variable must be set
 * - Folder must be publicly shared ("Anyone with link can view")
 */
export async function POST(request: NextRequest) {
  try {
    const { folderUrl } = await request.json();

    if (!folderUrl) {
      return NextResponse.json(
        { error: 'Folder URL is required' },
        { status: 400 }
      );
    }

    // Extract folder ID from various Drive URL formats
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json(
        { error: 'Invalid Drive folder URL. Please use a link like: https://drive.google.com/drive/folders/FOLDER_ID' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Drive API key not configured. Please add GOOGLE_DRIVE_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Call Drive API v3 to list files in folder
    const driveApiUrl =
      `https://www.googleapis.com/drive/v3/files?` +
      `q='${folderId}'+in+parents&` +
      `fields=files(id,name,mimeType)&` +
      `key=${apiKey}`;

    const response = await fetch(driveApiUrl);

    if (!response.ok) {
      const errorData = await response.json();

      // Handle common errors
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Folder not found. Make sure the folder is shared publicly ("Anyone with link can view").' },
          { status: 404 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. The folder must be set to "Anyone with link can view".' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `Drive API error: ${errorData.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const files = data.files || [];

    // Filter for images and videos only
    const mediaFiles = files.filter((file: any) =>
      file.mimeType.startsWith('image/') ||
      file.mimeType.startsWith('video/')
    );

    if (mediaFiles.length === 0) {
      return NextResponse.json(
        { error: 'No images or videos found in this folder.' },
        { status: 404 }
      );
    }

    // Convert to direct URLs
    const urls = mediaFiles.map((file: any) => {
      if (file.mimeType.startsWith('video/')) {
        // Videos need the "video:" prefix for type detection
        return `video: https://drive.google.com/file/d/${file.id}/view`;
      } else {
        // Images use the uc?export=view format
        return `https://drive.google.com/uc?export=view&id=${file.id}`;
      }
    });

    return NextResponse.json({
      urls,
      count: urls.length
    });

  } catch (error) {
    console.error('Error importing Drive folder:', error);
    return NextResponse.json(
      { error: 'Failed to import folder. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Extract folder ID from various Google Drive URL formats
 */
function extractFolderId(url: string): string | null {
  // Format 1: https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  // Format 2: https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return folderMatch[1];
  }

  // Format 3: Just the folder ID itself
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}
