import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'pp@playfulprocess.com';

export async function POST(request: NextRequest) {
  try {
    const { projectId, title, description, itemCount, userId, userEmail } = await request.json();

    // Initialize Resend only when needed (avoid build-time errors)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured - skipping email notification');
      return NextResponse.json({ success: true, sent: false });
    }

    const resend = new Resend(apiKey);

    // Send email to admin
    const { data: adminData, error: adminError } = await resend.emails.send({
      from: 'Recursive Creator <noreply@playfulprocess.com>',
      to: [NOTIFICATION_EMAIL],
      subject: `🎉 New Project Published: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #1e40af; margin: 0 0 10px;">🎉 New Project Published</h1>
            <p style="color: #64748b; margin: 0;">Someone just published a project on Recursive Creator!</p>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #334155; margin: 0 0 15px; font-size: 18px;">Project Details</h2>

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 120px;">Title:</strong>
              <span style="color: #1e293b;">${title}</span>
            </div>

            ${description ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; vertical-align: top; width: 120px;">Description:</strong>
              <span style="color: #1e293b; display: inline-block; width: calc(100% - 130px);">${description}</span>
            </div>
            ` : ''}

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 120px;">Items:</strong>
              <span style="color: #1e293b;">${itemCount || 0}</span>
            </div>

            <div style="margin-bottom: 15px;">
              <strong style="color: #475569; display: inline-block; width: 120px;">Project ID:</strong>
              <span style="color: #64748b; font-family: monospace; font-size: 12px;">${projectId}</span>
            </div>
          </div>

          <div style="text-align: center; padding: 20px;">
            <a href="https://recursive.eco/view/${projectId}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 10px;">
              🔗 View Project
            </a>
            <a href="https://creator.recursive.eco/dashboard"
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              📊 Go to Dashboard
            </a>
          </div>

          <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              Published: ${new Date().toLocaleString()}<br>
              User ID: ${userId || 'Unknown'}
            </p>
          </div>
        </div>
      `,
    });

    if (adminError) {
      console.error('❌ Failed to send admin notification:', adminError);
    } else {
      console.log('✅ Admin notification sent:', { emailId: adminData?.id });
    }

    // Send confirmation email to user
    if (userEmail) {
      const { data: userData, error: userError } = await resend.emails.send({
        from: 'Recursive Creator <noreply@playfulprocess.com>',
        to: [userEmail],
        subject: `✅ Your Project "${title}" is Now Published!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #16a34a; margin: 0 0 10px;">🎉 Success! Your Project is Live</h1>
              <p style="color: #166534; margin: 0;">Your project has been published and is now publicly accessible.</p>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #334155; margin: 0 0 15px; font-size: 18px;">Your Project</h2>
              <p style="color: #1e293b; font-size: 16px; font-weight: bold; margin-bottom: 10px;">${title}</p>
              ${description ? `<p style="color: #64748b; margin-bottom: 15px;">${description}</p>` : ''}
              <p style="color: #64748b; margin: 0;"><strong>Items:</strong> ${itemCount || 0}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #334155; margin: 0 0 10px; font-size: 16px;">Share Your Project</h3>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Your public URL:</p>
              <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 15px;">
                <a href="https://recursive.eco/view/${projectId}" style="color: #2563eb; text-decoration: none; font-family: monospace; font-size: 14px; word-break: break-all;">
                  https://recursive.eco/view/${projectId}
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                ⚠️ This link is public. Anyone with it can view your project.
              </p>
            </div>

            <div style="text-align: center; padding: 20px;">
              <a href="https://recursive.eco/view/${projectId}"
                 style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 10px;">
                🔗 View Your Project
              </a>
              <a href="https://creator.recursive.eco/dashboard"
                 style="display: inline-block; background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                📊 Back to Dashboard
              </a>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Questions? Reply to this email or visit <a href="https://recursive.eco" style="color: #2563eb;">recursive.eco</a>
              </p>
            </div>
          </div>
        `,
      });

      if (userError) {
        console.error('❌ Failed to send user confirmation:', userError);
      } else {
        console.log('✅ User confirmation sent:', { emailId: userData?.id, to: userEmail });
      }
    }

    return NextResponse.json({ success: true, sent: true, adminEmailId: adminData?.id });

  } catch (error) {
    console.error('Error sending publish notification:', error);
    // Silent failure - return success so user flow isn't interrupted
    return NextResponse.json({ success: true, sent: false });
  }
}
