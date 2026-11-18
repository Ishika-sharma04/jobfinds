# FresherJobs India

A Next.js App Router job discovery application backed by Supabase. Listings come only from configured public company ATS feeds (Greenhouse, Lever, and Ashby) and retain links to the original application page. The repository ships with no fabricated jobs or pre-filled company boards.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the system design, data flow, access controls, collection schedule, known issues, and troubleshooting notes.

## Requirements

- Node.js 22 or newer
- A Supabase project
- Google Gemini API key for AI classification (optional; unclassified listings can still be collected)
- Permission to use each configured company board feed under the relevant source terms

Gemini defaults to `gemini-3.8-flash`. Confirm the model remains available and set input/output token prices for your billing tier in `.env.local`; set both rates to `0` for a free tier. See Google's [model list](https://ai.google.dev/gemini-api/docs/models) and [current pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Run the preview

The web preview starts without credentials and shows `/setup` with the remaining configuration steps. The listing count stays empty until Supabase is connected and collection is run; the project does not include invented sample jobs.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and visit `http://localhost:3000/setup` for a live readiness checklist.

On a first visit, the homepage asks for a name, career stage, and role type. The profile appears in the sidebar dashboard and can be edited at any time. Name and career stage stay in local storage; the role preference is also stored in a same-site browser cookie so the server can enforce internship-only or full-time-only results. The `/how-it-works` page explains the listing and application flow.

The left navigation stays available while browsing. Users can save up to 100 job IDs in their browser and review active saved jobs at `/saved`.

## Connect live data

1. Copy `.env.example` to `.env.local` and fill in the Supabase project URL, publishable key, and secret key. The publishable key can be used by the browser; keep `SUPABASE_SECRET_KEY` and Gemini keys server-side and never prefix them with `NEXT_PUBLIC_`. Legacy `anon` and `service_role` key names are also accepted.
2. In Supabase SQL Editor, run `supabase/migrations/0001_initial.sql`.
3. The starter registry includes Cleo, SuperApp, and Instawork (Greenhouse); Hevo Data, Paytm, Drivetrain, Aleph, and Dun & Bradstreet (Lever); and Josys, Sarvam AI, NETGEAR, SPAN, TechTorch, AiPrise, Meraki Labs, and SentiLink (Ashby). Test feeds with `npm run sources:check`. To add more public boards, configure `GREENHOUSE_BOARDS`, `LEVER_BOARDS`, and `ASHBY_BOARDS` with comma-separated `slug:Company Display Name` values. Review each employer's terms before deployment. Set `ATS_STARTER_BOARDS=false` to disable starters; set an individual provider variable to `none` to turn off that provider's starter boards.
4. Optionally provide `GEMINI_API_KEY` for daily listing classification. AI output is schema-validated; failures leave the real listing available with pending fields.
5. Set `CRON_SECRET` and `ADMIN_SECRET` to long random secrets. The data dashboard at `/admin` requires the admin secret; its sidebar link is only shown after sign-in, and review submissions use an HTTP-only admin session cookie.
6. Run `npm run collect` to fetch and store listings, then restart `npm run dev` if you changed `.env.local`.

## Data sources and collection

Collectors use official ATS job-board read APIs and optional RSS feeds: [Greenhouse Job Board API](https://docs.greenhouse.io/job-board), [Lever Postings API](https://hire.lever.co/developer/documentation), and [Ashby public job postings API](https://developers.ashbyhq.com/docs/public-job-posting-api). Starter boards point to employer-hosted career listings, including [Cleo India](https://job-boards.greenhouse.io/cleoindia), [Hevo Data](https://jobs.lever.co/hevodata), [Josys](https://jobs.ashbyhq.com/josys), and [Sarvam AI](https://jobs.ashbyhq.com/sarvam). Collection calls vendor read endpoints, does not submit applications, and stores the employer's original apply URL. Review each employer's terms and applicable rate limits before deployment. Collectors retry transient fetch and Gemini failures up to three times, pause between boards, and log source-level outcomes. Location matching includes Indian cities and India-designated remote roles.

`npm run collect` discovers current listings, deduplicates canonical URLs, repeated company/title/location combinations, and highly similar descriptions, optionally classifies each posting, and upserts results. Unchanged descriptions reuse saved classification to avoid repeated Gemini charges. Listings explicitly classified as not fresher-eligible are kept for audit in review status and are not displayed in active search. Failed classifications remain visibly unconfirmed. Listings not seen for 14 days are marked expired only when every configured source reported success. The GitHub Actions workflow runs daily at 02:17 UTC and can also be started manually. Add the listed Supabase and Gemini secrets, board slugs, and permitted RSS feed entries as GitHub Actions secrets/variables.

Starter feeds are enabled by default, but a new deployment still starts with zero database listings until Supabase is configured and collection succeeds. `npm run sources:check` tests feed access without writing to the database; `npm run collect` stores eligible live listings. The starter list does not guarantee 200 listings: actual volume depends on current employer openings and the approved sources you configure. The homepage shows actual database counts only.

## Search and pages

The homepage supports search, city, role, job type, experience and work-mode filters, and 20-item pagination. Each filter change applies immediately while preserving other chosen filters. The collection accepts India locations and India-designated remote roles; explicitly named non-India countries are rejected. Detail pages link directly to the originating job page. Public read access is limited by RLS to active jobs and successful run timestamps. All writes use the server-only Supabase service role.

## Admin, evaluation and AI cost

`/admin` reads run counts, latest run, classification totals and review metrics from Supabase. It selects a manual review sample of up to 50 unverified postings. A trusted reviewer can record independent field judgments through `POST /api/evaluate` with `Authorization: Bearer $ADMIN_SECRET` and JSON fields `job_id`, `reviewer`, `role_correct`, `city_correct`, `experience_correct`, and `job_type_correct`. Don't expose the admin secret in browser code. The endpoint upserts per job/reviewer. Accuracy is calculated from submitted judgments, never synthesized.

Gemini `usageMetadata` token counts are stored in `ai_usage`. Cost stays “not available” unless actual model pricing is recorded in `input_cost_usd` and `output_cost_usd` for usage rows; pricing changes and must be verified for the selected model before reporting cost. Classification errors and absent credentials do not affect source listing provenance.

## Deploy

- **Vercel:** import the repository, set the same website and Supabase environment variables, deploy.
- **Supabase:** apply migration and keep service role key in Vercel/GitHub secrets only.
- **GitHub Actions:** enable Actions, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and Gemini repository secrets plus approved board variables.

For Vercel refresh `/api/collect` from an external scheduler using `Authorization: Bearer $CRON_SECRET`, or use GitHub Actions CLI collection. Never expose the Supabase service role, Gemini key, CRON secret, or ADMIN secret to the client.

## Validation

`npm run typecheck` checks TypeScript; `npm run build` compiles the production application. No automated test suite is included yet. The build does not demonstrate live data availability, third-party credentials, 200-job volume, manual accuracy, or AI classification performance; verify those after deployment against the populated database.
