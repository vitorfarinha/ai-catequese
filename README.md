# IA Catequese (Next.js 14 App Router) - MVP

Project ready for deployment on Vercel (App Router, Next.js 14).
Now uses **Anthropic's Claude API** (`@anthropic-ai/sdk`) instead of OpenAI.

## Notes
- Add your `ANTHROPIC_API_KEY` as an environment variable in Vercel (or `.env.local` locally).
- The system prompt is defined in `app/api/chat/route.js` (backend) — keep it there to avoid exposure.
- Model used: `claude-sonnet-5` (change the `MODEL` constant in `app/api/chat/route.js` if you want a different one).
- Uploads go through Anthropic's beta **Files API** (`client.beta.files.upload`), which requires the
  `files-api-2025-04-14` beta header (already set in the code). Files are stored once and referenced by
  `file_id` in later chat requests — the upload route returns that ID and the chat route attaches it to
  the next user turn as a `document` content block.
- The Files API's `document` block natively supports PDFs and plain text. Formats like `.docx`/`.xlsx`
  aren't accepted directly — if you need those, convert them to PDF/plain text before upload, or extend
  `app/api/upload/route.js` to do the conversion server-side.
- This is a minimal MVP without authentication or database.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
Push to GitHub and import project to Vercel. Add environment variable:
- ANTHROPIC_API_KEY
