import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { documentId, reportType, explanation, viewerUrl } = await request.json();

    // Validate input
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    if (reportType === 'unpublish' && (!explanation || explanation.length < 50)) {
      return NextResponse.json(
        { error: 'Explanation must be at least 50 characters when unpublishing' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch document and creator info
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .select('id, user_id, document_data')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Fetch creator email from auth.users table
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      document.user_id
    );

    if (userError) {
      console.error('Error fetching user:', userError);
    }

    const creatorEmail = userData?.user?.email;
    const playlistTitle = document.document_data?.title || 'Untitled Playlist';

    // Update document in Supabase
    const updates: any = {
      reported: true,
    };

    if (reportType === 'unpublish') {
      updates.document_data = {
        ...document.document_data,
        is_published: 'false',
      };
    }

    const { error: updateError } = await supabase
      .from('user_documents')
      .update(updates)
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    // Send email to admin (pp@playfulprocess.com)
    const adminEmailBody = `
<h2>Content Report - Recursive.Eco</h2>

<p><strong>Document ID:</strong> ${documentId}</p>
<p><strong>Report Type:</strong> ${reportType === 'unpublish' ? 'Unpublished by Reporter' : 'Notification Only'}</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
<p><strong>Viewer URL:</strong> ${viewerUrl || `https://recursive.eco/view/${documentId}`}</p>
<p><strong>Playlist Title:</strong> ${playlistTitle}</p>
<p><strong>Creator Email:</strong> ${creatorEmail || 'Unknown'}</p>

<h3>User Explanation:</h3>
<p>${explanation || 'No explanation provided'}</p>

<hr>
<p><strong>Action Needed:</strong> Review content immediately</p>
    `;

    try {
      await resend.emails.send({
        from: 'Recursive.Eco <noreply@recursive.eco>',
        to: 'pp@playfulprocess.com',
        subject: '[URGENT] Content Report - recursive.eco',
        html: adminEmailBody,
      });
    } catch (emailError) {
      console.error('Error sending admin email:', emailError);
    }

    // Send email to creator if we have their email
    if (creatorEmail) {
      let creatorEmailBody = '';
      let creatorSubject = '';

      if (reportType === 'unpublish') {
        creatorSubject = 'Content Unpublished - Recursive.Eco';
        creatorEmailBody = `
<h2>Content Unpublished</h2>

<p>Hello,</p>

<p>Your published playlist has been unpublished due to a content report.</p>

<p><strong>Playlist:</strong> ${playlistTitle}</p>
<p><strong>View URL:</strong> ${viewerUrl || `https://recursive.eco/view/${documentId}`} (now private)</p>

<p>This content is currently under review. If you believe this was done in error, you can appeal to pp@playfulprocess.com</p>

<p>Thank you,<br>Recursive.Eco Team</p>
        `;
      } else {
        creatorSubject = 'Content Report Notification - Recursive.Eco';
        creatorEmailBody = `
<h2>Content Report Notification</h2>

<p>Hello,</p>

<p>Your published playlist has been reported by a viewer for review.</p>

<p><strong>Playlist:</strong> ${playlistTitle}</p>
<p><strong>View URL:</strong> ${viewerUrl || `https://recursive.eco/view/${documentId}`}</p>

<p>Recursive.Eco will analyze this content and unpublish it if deemed inappropriate.</p>

<p>If you have anything to say about this report, please email pp@playfulprocess.com</p>

<p>Thank you,<br>Recursive.Eco Team</p>
        `;
      }

      try {
        await resend.emails.send({
          from: 'Recursive.Eco <noreply@recursive.eco>',
          to: creatorEmail,
          subject: creatorSubject,
          html: creatorEmailBody,
        });
      } catch (emailError) {
        console.error('Error sending creator email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: reportType === 'unpublish'
        ? 'Content has been unpublished and reported. Thank you for keeping our community safe.'
        : 'Report submitted. We will review this content. Thank you.',
    });

  } catch (error) {
    console.error('Report content error:', error);
    return NextResponse.json(
      { error: 'Failed to process report' },
      { status: 500 }
    );
  }
}
