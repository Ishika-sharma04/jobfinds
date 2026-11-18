# FresherJobs India: how the app is put together

This is a guide to the code that is in the project today. It also calls out the parts that still need attention, so it is clear what works and what does not.

## The short version

The website is built with Next.js. Supabase stores the job listings and the collection history. A separate server-side collector reads configured public job feeds, filters for India, removes duplicates, optionally asks Gemini to add labels, and saves the result. GitHub Actions is set up to run that collector each day.

```mermaid
flowchart LR
  Browser[Job seeker] --> Web[Next.js website]
  Web --> JobsAPI[/api/jobs]
  JobsAPI --> Search[lib/jobs.ts]
  Search --> DB[(Supabase Postgres)]
  Admin[Admin] --> AdminAPI[/Admin API routes]
  AdminAPI --> Ingest[server/ingest.ts]
  Daily[GitHub Actions schedule] --> Ingest
  Ingest --> Feeds[Greenhouse, Lever, Ashby, RSS]
  Feeds --> India[Keep India listings]
  India --> Dedupe[Remove duplicates]
  Dedupe --> Gemini[Optional Gemini labels]
  Gemini --> DB
  Ingest --> DB
```

The browser reads listings from the app and Supabase. It does not call job boards or Gemini directly. The Gemini and Supabase secret keys stay on the server.

## Where things live

| Part | Files | What they do |
| --- | --- | --- |
| Pages | `app/page.tsx`, `app/jobs/[id]/page.tsx`, `app/saved/page.tsx`, `app/how-it-works/page.tsx` | Show the job search, job details, saved jobs, and an explanation of the service. |
| Shared interface | `components/AppShell.tsx`, `components/JobBrowser.tsx` | Navigation, search, filters, job cards, paging, refresh, and loading/error states. |
| Job search | `app/api/jobs/route.ts`, `lib/jobs.ts` | Read filter values and query active jobs in Supabase. |
| Database connection | `lib/supabase.ts` | Set up a public read client and a private server client for writes. |
| Collection | `server/collectors/`, `server/ingest.ts`, `server/collect.ts` | Read feeds, keep India listings, remove duplicates, classify when enabled, and save jobs. |
| Admin and reviews | `app/admin/page.tsx`, `app/api/admin/`, `app/api/evaluate/route.ts`, `components/EvaluationTable.tsx` | Admin access, manual collection, and human review of classification accuracy. |
| Database schema | `supabase/migrations/0001_initial.sql` | Create the tables, indexes, access rules, and review-sampling function. |
| Daily run | `.github/workflows/daily-collection.yml` | Run `npm run collect` on a schedule or when manually started. |

## How a listing gets into the site

1. `server/collectors/registry.ts` reads the configured Greenhouse, Lever, and Ashby boards. RSS feeds can also be configured.
2. The collectors in `server/collectors/` request each provider's public job feed. They retry some temporary failures and pause between boards.
3. `server/collectors/location.ts` keeps listings that look India-based. Other locations are dropped before saving.
4. `server/deduplication/index.ts` removes repeated canonical URLs and repeated company/title/location combinations. It also drops very similar descriptions for the same company and location.
5. `server/ingest.ts` records the run, checks which listings already exist, and saves or updates the unique results. It keeps the original employer application URL.
6. When every configured feed succeeds, jobs that have not been seen for 14 days may be marked expired. If a feed fails, the collector skips this expiry step to avoid hiding jobs because one source was unavailable.

A listing classified as not fresher-eligible is held for review. Active listings appear in search. A job that has not been classified can still appear with its status unverified. Manual verification is recorded separately from AI classification.

### Sources and site rules

The collectors use public ATS read feeds and RSS feeds. They do not sign in, apply to jobs, bypass CAPTCHAs, or access pages behind a login. Before using a feed in production, check the relevant employer/provider terms and rate limits. If a source blocks access or requires a CAPTCHA, do not try to get around it.

## How search and filters work
When someone changes a filter, `JobBrowser` requests `/api/jobs` in the background. The page stays put; it does not reload.

`app/api/jobs/route.ts` reads the query values, then `lib/jobs.ts` builds the Supabase query:

- Search checks the title, company, and skills.
- Location checks both the city field and the source's location text.
- Role checks the category and matching words in the job title. Title matching helps for older rows where category is blank.
- Job type, experience, and work mode use the corresponding stored fields.
- Separate filters are combined: a job has to match every selected filter. Within role and location, any matching alternative is enough.
- Results are newest first, 20 at a time.
- A user's first-visit preference can keep the search to internships or full-time jobs.

The homepage shows the number of matching jobs and companies on the current page. It no longer shows the last update date or time. The admin dashboard still shows collection status.

## What Gemini does (and does not do)

Gemini is optional. If `GEMINI_API_KEY` is configured, `server/classification/gemini.ts` sends job details in small batches and asks for structured labels such as role, city, experience, job type, and work mode. It treats the job description as untrusted text and validates the response with Zod before the collector uses it.

Gemini does not find jobs or confirm that a job is still open. The public feeds provide the listings. If Gemini is unavailable, out of quota, or returns invalid data, the listing can be saved without those labels and stays unverified.

The collector records Gemini input/output token counts in `ai_usage`. It calculates cost only if the matching per-million token rates are configured. If the description has not changed, the existing classification is reused to avoid another request.

Resume upload and resume-to-job matching have been removed. The app no longer parses or sends resume text. Old resume data in the current browser session is cleared when the app loads.

## Database and private data

The migration creates four main tables:

- `jobs` stores listings, source links, classification, status, and manual verification time.
- `collection_runs` stores run totals, errors, and the result from each source.
- `ai_usage` stores model usage and configured cost estimates.
- `job_evaluations` stores a reviewer's answers for role, city, experience, and job type.

Row-level security allows public reads of active jobs and successful run timestamps. Writes and review data use the private Supabase server key. Keep `SUPABASE_SECRET_KEY` (or the legacy service-role key) and `GEMINI_API_KEY` out of browser code and never give them a `NEXT_PUBLIC_` prefix.

Admin actions require an admin session. The collection endpoint refuses requests without that session and checks for a recent run before starting another one.

## Human accuracy reviews

The database function `random_unverified_jobs()` picks up to 50 active listings that have not yet been reviewed. On the admin page, a reviewer marks whether the role, city, experience, and job type are correct. The dashboard can calculate accuracy for each field from those answers. These numbers describe the reviewed sample only; they should not be presented as verification of every listing.

## Daily collection versus the refresh button

GitHub Actions is scheduled for `02:17 UTC`, about `07:47` India time. It installs the dependencies and runs `npm run collect`. It can also be started manually. The workflow needs the Supabase secrets and source settings; Gemini is optional.

The **Refresh listings** button on the website only reloads the current results from Supabase. It does not contact job sites. New openings are collected by the daily workflow, by running `npm run collect`, or by an authorized admin collection action.

## Running the project

Use Node.js 22 or newer and npm. For live listings, create a Supabase project, copy `.env.example` to `.env.local`, set the needed values, and run `supabase/migrations/0001_initial.sql` in Supabase SQL Editor. Keep private keys on the server.

```bash
npm install
npm run dev
npm run typecheck
npm run sources:check
npm run collect
```

The site can open without Supabase and show its setup/empty state. It needs valid credentials, the database migration, and a successful collection to show live records. `npm run sources:check` checks feeds without saving jobs. `npm run collect` writes to Supabase and may use Gemini if its key is set.

## What has and has not been checked

- `npm run typecheck` passed after the resume feature was removed and stale generated Next.js types were cleared.
- The latest `npm run sources:check` run reached none of the 16 configured ATS feeds and found zero India listings. The reason still needs to be checked in the environment where collection will run; it could be network access, a feed issue, or board settings.
- `npm run build` stopped with `spawn EPERM` on this Windows setup. A successful production build has not been confirmed.
- No jobs were added by the failed feed check. Configured company boards are not the same thing as currently open jobs.
- A collection run can finish its pipeline while individual feeds have errors. Check `source_results` and `failed_count` in the admin data; do not rely only on the overall run status.

## Quick troubleshooting

| If you see this | Check this first |
| --- | --- |
| No jobs appear | Check Supabase settings, run the migration, open `/setup`, and confirm that a collection actually saved listings. |
| A role filter has no results | Check the active jobs' titles and categories. The title fallback helps with blank categories, but it cannot find jobs that are not in the database. |
| Feeds fail | Check source results, network access, provider/board slug, rate limits, and feed availability. Do not bypass access controls or CAPTCHAs. |
| AI labels are missing | Check the server-side Gemini key, quota, model setting, and collection/usage records. Jobs can remain unclassified. |
| Typecheck mentions a deleted route | Remove or regenerate stale `.next` type output, then rerun typecheck. Do not recreate a removed route just to satisfy generated files. |
| Build reports `spawn EPERM` | Check Windows process permissions, antivirus/controlled folder settings, and the local Node/Next setup. The build has not yet succeeded in this environment. |
