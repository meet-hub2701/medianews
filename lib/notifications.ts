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
