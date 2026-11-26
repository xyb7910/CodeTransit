<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0652b450-22e8-4f40-b7d4-cdd502a5fc1c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

Open the in-page guide to try Code Studio, Algorithm Studio, and export.
You can skip the guide and reopen it from the header at any time.

AI creation is optional. Open **API Key** in the header to add named Gemini or
OpenAI-compatible configurations. For a compatible provider, enter its HTTPS
Base URL and model name. Select a saved configuration and choose **Save & Enable**
to switch. Each configuration stays in memory unless you opt in to saving it in
the current tab's session storage.

## Deploy Transit on Vercel

Connect an Upstash Redis database to the Vercel project for the **Production**
environment and redeploy. The API reads `KV_REST_API_URL` and
`KV_REST_API_TOKEN` injected by the integration. The equivalent
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names also work.
Use a read/write token and keep both variables server-side.

After deploying, `GET /api/transit/status` should return `{"ok":true}`.
`TRANSIT_NOT_CONFIGURED` means the Redis environment variables are missing.
`TRANSIT_UNAVAILABLE` means the API could not reach Redis or execute a command.
Standalone local development with `npm run dev` uses the existing
`data/transit-store.json` file when Redis is unset.
