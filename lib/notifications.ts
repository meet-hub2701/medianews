import nodemailer from 'nodemailer';

/**
 * Sends an email notification using SMTP (e.g., Gmail, SendGrid).
 * @param to Recipient email
 * @param subject Email subject
 * @param html Email body (HTML)
 */
export async function sendEmailNotification(to: string, subject: string, html: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn("Skipping Email Notification: SMTP credentials missing.");
      return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || `"Sanity Agent" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email Notification Sent:", info.messageId);
  } catch (error) {
    console.error("Failed to send Email notification:", error);
  }
}

/**
 * Sends a notification to a Slack Channel using an Incoming Webhook.
 * @param message The text to display in Slack
 * @param blocks Optional Slack Block Kit blocks for rich formatting
 */
export async function sendSlackNotification(message: string, blocks?: any[]) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("Skipping Slack Notification: SLACK_WEBHOOK_URL is missing in .env.local");
    return;
  }

  try {
    const payload = {
      text: message, // Fallback text
      blocks: blocks || undefined
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    console.log("Slack Notification Sent!");
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
}
