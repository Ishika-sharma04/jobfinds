import { loadEnvConfig } from '@next/env';

async function main() {
  loadEnvConfig(process.cwd());
  const [{ collectAll }, { sourceStatuses }, { getConfiguredSourceCounts }, { deduplicate }] = await Promise.all([
    import('./collectors/ats'),
    import('./collectors/status'),
    import('./collectors/registry'),
    import('./deduplication'),
  ]);
  const counts = getConfiguredSourceCounts();
  const jobs = await collectAll();
  const uniqueJobs = deduplicate(jobs);
  const statuses = Object.entries(sourceStatuses).map(([source, status]) => ({ source, ...status }));
  console.log(JSON.stringify({ configured: counts, indiaListingsFound: jobs.length, uniqueIndiaListings: uniqueJobs.length, duplicatesRemoved: jobs.length - uniqueJobs.length, sources: statuses }, null, 2));
  if (statuses.length === 0) throw new Error('No job sources are configured.');
  if (!statuses.some((source) => source.status === 'success')) {
    throw new Error('Every source failed. Check network access, board IDs, and source status details above.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
