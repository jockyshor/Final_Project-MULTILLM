export function isVolatileQuery(text: string): boolean {
  const query = text.toLowerCase();

  const volatilePatterns = [
    /\blatest\b/, /\bcurrent\b/, /\bcurrently\b/, /\bright now\b/, /\btoday\b/,
    /\bthis week\b/, /\bthis month\b/, /\bthis year\b/, /\bwho won\b/, /\bwinner\b/,
    /\bchampion\b/, /\bchampions\b/, /\bwon the\b/, /\bwinning\b/, /\bmost recent\b/,
    /\brecent\b/, /\bnewest\b/, /\bnew release\b/, /\blatest release\b/,
    /\bcurrent version\b/, /\bversion\b/, /\breleased\b/, /\belection\b/,
    /\belected\b/, /\bpresident\b/, /\bprime minister\b/, /\bceo\b/, /\bleader\b/,
    /\bweather\b/, /\bstock\b/, /\bprice\b/, /\bschedule\b/, /\bstandings\b/,
    /\bscore\b/, /\bresult\b/, /\bresults\b/, /\baward\b/, /\bawards\b/,
    /\bnews\b/, /\bupdate\b/, /\bupdates\b/,
  ];

  return volatilePatterns.some((pattern) => pattern.test(query));
}

export function isCurrentOutcomeQuery(text: string): boolean {
  const query = text.toLowerCase();

  return (
    /\bwho won\b/.test(query) ||
    /\bwinner\b/.test(query) ||
    /\bchampion\b/.test(query) ||
    /\bchampions\b/.test(query) ||
    /\blatest\b/.test(query) ||
    /\bcurrent\b/.test(query) ||
    /\bmost recent\b/.test(query)
  );
}

export function buildFreshnessSearchQuery(
  originalQuery: string,
  currentDate: string
): string {
  const yearMatch = currentDate.match(/\b(20\d{2})\b/);
  const currentYear = yearMatch?.[1] || new Date().getFullYear().toString();

  const cleaned = originalQuery
    .replace(/\b20\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (isCurrentOutcomeQuery(originalQuery)) {
    return `${cleaned} current latest result ${currentYear} official`;
  }

  return `${cleaned} latest current information ${currentYear} official`;
}

export function addTemporalEvidenceInstructions(
  toolName: string,
  originalQuery: string,
  currentDate: string
): string {
  if (toolName !== 'browse_web') {
    return '';
  }

  const currentYear =
    currentDate.match(/\b(20\d{2})\b/)?.[1] ||
    new Date().getFullYear().toString();

  return `
TEMPORAL EVIDENCE CHECK:
- User query: "${originalQuery}" | Current date: ${currentDate} (${currentYear})
- Distinguish the ARTICLE PUBLICATION DATE from the actual EVENT DATE.
- For winner/champion questions, identify the most recent completed event and its actual winner.
- If this evidence does not clearly confirm the current state, perform a second targeted search. Otherwise, conclude.`;
}
