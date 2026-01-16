# Agent Backend Next (HITL News Workflow)

This project is a Next.js application that serves as the backend orchestrator and CMS for the HITL (Human-in-the-Loop) News Workflow. It integrates Google Cloud services and AI to automate press release processing while triggering editorial review in Sanity Studio.

## Architecture

*   **Framework:** Next.js (App Router)
*   **CMS:** Sanity.io (Embedded Studio)
*   **Storage:** Google Cloud Storage (GCS)
*   **OCR/Parsing:**
    *   **PDF:** Google Document AI
    *   **Word:** Mammoth (Node.js)
*   **AI Engine:** Google Gemini Pro (`google-generative-ai`)
*   **Notifications:** Slack (Webhook) & Email (Nodemailer)

## Features

1.  **Automatic Flow (Zapier):** Receives file URLs via Webhook, uploads to GCS, parses, rewrites, and posts to Sanity.
2.  **Manual Flow (Studio):** "Generate AI Draft" button in Sanity Studio triggers the same pipeline for manually uploaded files.
3.  **Review Interface:** Split-pane view to compare Original PDF/Doc vs AI Draft.
4.  **Notifications:** Real-time alerts to Slack and Email when a draft is ready.

## Setup & Installation

1.  **Clone & Install:**
    ```bash
    git clone <repo-url>
    cd agent-backend-next
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env.local` file with the following keys:
    ```env
    # Sanity
    NEXT_PUBLIC_SANITY_PROJECT_ID=your_id
    NEXT_PUBLIC_SANITY_DATASET=production
    SANITY_API_TOKEN=your_token

    # Google Cloud (Storage & DocAI)
    GCP_PROJECT_ID=your_gcp_project
    GCP_CLIENT_EMAIL=your_service_account_email
    GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    GCS_BUCKET_NAME=your_bucket_name
    DOCAI_PROCESSOR_ID=your_processor_id

    # Gemini AI
    GEMINI_API_KEY=your_gemini_key

    # Notifications
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
    SMTP_HOST=smtp.gmail.com
    SMTP_USER=your_email
    SMTP_PASS=your_app_password
    EDITOR_EMAIL=recipient@example.com
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Access the Studio at [http://localhost:3000/studio](http://localhost:3000/studio).

## Key Modules

*   **`app/api/start-process/route.ts`**: The main entry point. Orchestrates the pipeline (Upload -> OCR -> AI -> Sanity).
*   **`lib/ocr.ts`**: Handles text extraction. Automatically routes `.pdf` to Document AI and `.docx` to Mammoth.
*   **`lib/llm.ts`**: Prompts Gemini Pro to rewrite the text into a news article.
*   **`lib/notifications.ts`**: Handles sending alerts.
*   **`sanity/GenerateAction.tsx`**: Custom Document Action that adds the "Generate" button to the Studio.

## Deployment

This app is optimized for Vercel.
1.  Push to GitHub.
2.  Import project in Vercel.
3.  Add all Environment Variables in Vercel Dashboard.
4.  Deploy.

---
*Created for Issue #2524 - HITL News Workflow*
