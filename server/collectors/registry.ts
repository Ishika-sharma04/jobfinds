export type ATSProvider = 'GREENHOUSE' | 'LEVER' | 'ASHBY';
export type ATSBoard = { slug: string; company: string };

/**
 * Starter boards point to employer career pages hosted by the ATS vendor.
 * Collection uses only the vendor's public job-board read APIs and retains
 * the employer's original application URL. Review employer terms before
 * deploying and use ATS_STARTER_BOARDS=false to disable these defaults.
 */
export const starterBoards: Record<ATSProvider, ATSBoard[]> = {
  GREENHOUSE: [
    { slug: 'cleoindia', company: 'Cleo' },
    { slug: 'superapp', company: 'SuperApp' },
    { slug: 'instawork', company: 'Instawork' },
  ],
  LEVER: [
    { slug: 'hevodata', company: 'Hevo Data' },
    { slug: 'paytm', company: 'Paytm' },
    { slug: 'drivetrain', company: 'Drivetrain' },
    { slug: 'aleph', company: 'Aleph' },
    { slug: 'dnb', company: 'Dun & Bradstreet' },
  ],
  ASHBY: [
    { slug: 'josys', company: 'Josys' },
    { slug: 'sarvam', company: 'Sarvam AI' },
    { slug: 'netgear', company: 'NETGEAR' },
    { slug: 'span', company: 'SPAN' },
    { slug: 'techtorch', company: 'TechTorch' },
    { slug: 'aiprise', company: 'AiPrise' },
    { slug: 'Meraki-Labs', company: 'Meraki Labs' },
    { slug: 'sentilink', company: 'SentiLink' },
  ],
};

export function getATSBoards(provider: ATSProvider): ATSBoard[] {
  const includeStarters = process.env.ATS_STARTER_BOARDS !== 'false';
  const values = (process.env[`${provider}_BOARDS`] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const explicitNone = values.some((value) => value.toLowerCase() === 'none');
  const custom = values
    .filter((value) => value.toLowerCase() !== 'none')
    .map((value) => {
      const [slug, ...label] = value.split(':');
      return { slug: slug.trim(), company: label.join(':').trim() || slug.trim() };
    })
    .filter((board) => board.slug);

  const seeds = includeStarters && !explicitNone ? starterBoards[provider] : [];
  const bySlug = new Map<string, ATSBoard>();
  for (const board of [...seeds, ...custom]) bySlug.set(board.slug.toLowerCase(), board);
  return [...bySlug.values()];
}

export function getConfiguredSourceCounts() {
  return {
    greenhouse: getATSBoards('GREENHOUSE').length,
    lever: getATSBoards('LEVER').length,
    ashby: getATSBoards('ASHBY').length,
    rss: [...new Set((process.env.RSS_FEEDS || '').split(',').map((x) => x.trim()).filter(Boolean))].length,
  };
}
