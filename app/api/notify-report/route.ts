import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'pp@playfulprocess.com';

// CORS headers for cross-origin requests from recursive.eco domains
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins (or specify 'https://dev.recursive.eco, https://recursive.eco')
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { contentId, reportType, explanation, reporterEmail, viewerUrl } = await request.json();

    // Initialize Resend only when needed (avoid build-time errors)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured - skipping email notification');
      return NextResponse.json({ success: true, sent: false }, { headers: corsHeaders });
    }

    const resend = new Resend(apiKey);

    // Determine report type display
    const reportTypeDisplay = reportType === 'unpublish' ? 'UNPUBLISHED' : 'NOTIFICATION ONLY';
    const urgencyTag = reportType === 'unpublish' ? '[URGENT]' : '';

    // Send email to admin
    const { data: adminData, error: adminError } = await resend.emails.send({
      from: 'Recursive.eco Reports <noreply@playfulprocess.com>',
      to: [NOTIFICATION_EMAIL],
      subject: `${urgencyTag} Content Report - recursive.eco`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${reportType === 'unpublish' ? '#fee2e2' : '#dbeafe'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: ${reportType === 'unpublish' ? '#dc2626' : '#1e40af'}; margin: 0 0 10px;">
              ${reportType === 'unpublish' ? '🚨 URGENT: Content Unpublished' : '⚠️ Content Reported'}
            </h1>
            <p style="color: #64748b; margin: 0;">A user has reported inappropriate content.</p>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #334155; margin: 0 0 15px; font-size: 18px;">Report Details</h2>

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 140px;">Report Type:</strong>
              <span style="color: #1e293b; font-weight: 600;">${reportTypeDisplay}</span>
            </div>

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 140px;">Content ID:</strong>
              <span style="color: #64748b; font-family: monospace; font-size: 12px;">${contentId}</span>
            </div>

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 140px;">Reporter Email:</strong>
              <span style="color: #1e293b;">${reporterEmail || 'Not provided'}</span>
            </div>

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 140px;">Timestamp:</strong>
              <span style="color: #1e293b;">${new Date().toLocaleString()}</span>
            </div>

            ${explanation ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 6px; border-left: 4px solid ${reportType === 'unpublish' ? '#dc2626' : '#3b82f6'};">
              <strong style="color: #475569; display: block; margin-bottom: 8px;">User Explanation:</strong>
              <p style="color: #1e293b; margin: 0; white-space: pre-wrap;">${explanation}</p>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center; padding: 20px;">
            <a href="${viewerUrl}"
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 10px;">
              🔗 View Content
            </a>
            <a href="https://supabase.com/dashboard/project/guqiiigapjmaanpdrgqk/editor"
               style="display: inline-block; background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              📊 Go to Supabase
            </a>
          </div>

          <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              ${reportType === 'unpublish' ? '⚠️ This content has been automatically unpublished and removed from public view.' : '📝 This is a notification only. Content remains published.'}
            </p>
          </div>
        </div>
      `,
    });

    if (adminError) {
      console.error('❌ Failed to send admin notification:', adminError);
      // Don't fail the request - report was saved to DB
    } else {
      console.log('✅ Admin notification sent:', { emailId: adminData?.id });
    }

    return NextResponse.json({ success: true, sent: true, adminEmailId: adminData?.id }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error sending report notification:', error);
    // Silent failure - return success so user flow isn't interrupted
    return NextResponse.json({ success: true, sent: false }, { headers: corsHeaders });
  }
}
