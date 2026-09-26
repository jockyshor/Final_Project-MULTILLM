import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { initMcpClient } from './client.js';
import { searchSimilarChunks } from '../rag/index.js';


// 1. DEFINE SANDBOX BOUNDARY (Project Root)
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PROTECTED_PATTERNS = ['.env', '.git', 'node_modules'];

function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, targetPath);
  if (!resolved.startsWith(PROJECT_ROOT)) return false;
  return !PROTECTED_PATTERNS.some(pattern => resolved.includes(pattern));
}

// 2. EXPORT MCP TOOLS
export const projectTools: Record<string, any> = {
  // TOOL 1: list_directory
  list_directory: tool({
    description: 'List files and directories within a given project folder to explore codebase structure.',
    parameters: z.object({
      directoryPath: z.string().optional().describe('Relative folder path from project root (e.g., "." or "server/src")'),
      path: z.string().optional(),
      dirPath: z.string().optional(),
    }),
    execute: async (args: any) => {
      const dirPath = args?.directoryPath || args?.path || args?.dirPath || '.';
      console.log(`🔧 [Tool Execution] list_directory("${dirPath}")`);

      if (!isPathSafe(dirPath)) {
        return { error: 'Access Denied: Path is outside project sandbox.' };
      }

      const fullPath = path.resolve(PROJECT_ROOT, dirPath);

      try {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        return {
          path: dirPath,
          entries: entries
            .filter(e => !PROTECTED_PATTERNS.includes(e.name))
            .map(e => ({
              name: e.name,
              isDirectory: e.isDirectory(),
            })),
        };
      } catch (err: any) {
        return { error: `Failed to read directory: ${err.message}` };
      }
    },
  } as any),

  // TOOL 2: read_file
  read_file: tool({
    description: 'Read the text content of a source file within the project.',
    parameters: z.object({
      filePath: z.string().optional().describe('Relative path to the file from project root (e.g., "server/package.json")'),
      path: z.string().optional(),
      file: z.string().optional(),
    }),
    execute: async (args: any) => {
      const rawPath = args?.filePath || args?.path || args?.file;
      console.log(`🔧 [Tool Execution] read_file("${rawPath}")`);

      if (!rawPath || typeof rawPath !== 'string') {
        return { error: 'filePath parameter is required to read a file.' };
      }

      if (!isPathSafe(rawPath)) {
        return { error: 'Access Denied: Path is outside project sandbox or accesses protected files (.env).' };
      }

      const fullPath = path.resolve(PROJECT_ROOT, rawPath);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const truncated = content.length > 4000 ? content.slice(0, 4000) + '\n...[Truncated]' : content;
        return {
          filePath: rawPath,
          content: truncated,
        };
      } catch (err: any) {
        return { error: `Failed to read file "${rawPath}": ${err.message}` };
      }
    },
  } as any),

  // TOOL 3: TAVILY AI AGENT SEARCH (With Token Compression)
  // TOOL 3: TAVILY AI AGENT SEARCH
// 🕐 Freshness-aware live web search with temporal evidence preservation
browse_web: tool({
  description:
    'Search the live global internet for real-time news, sports results, scores, champions, current facts, current events, software releases, and other time-sensitive information. Automatically applies freshness-aware search behavior for latest/current questions.',

  parameters: z.object({
    query: z
      .string()
      .describe(
        'Search query for live web search (e.g., "who won the latest Super Bowl", "latest NFL champion", "current React version")'
      ),

    topic: z
      .string()
      .optional()
      .describe(
        'Optional Tavily topic hint such as "news" or "general".'
      ),

    time_range: z
      .enum([
        'day',
        'week',
        'month',
        'year',
      ])
      .optional()
      .describe(
        'Optional freshness window for time-sensitive searches.'
      ),
  }),

  execute: async (rawArgs: any) => {
    // ================================================================
    // 1. NORMALIZE ARGUMENTS
    // ================================================================

    let args = rawArgs;

    if (typeof rawArgs === 'string') {
      try {
        args = JSON.parse(rawArgs);
      } catch {
        args = {
          query: rawArgs,
        };
      }
    }

    let query =
      args?.query ||
      args?.topic ||
      args?.search ||
      args?.q;

    if (
      typeof query === 'object' &&
      query !== null
    ) {
      query =
        query.query ||
        query.topic ||
        JSON.stringify(query);
    }

    if (
      !query ||
      typeof query !== 'string'
    ) {
      return {
        error:
          'Search query is required.',
      };
    }

    const cleanQuery = query
      .replace(/["'“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery) {
      return {
        error:
          'Search query cannot be empty.',
      };
    }

    // ================================================================
    // 2. TAVILY API KEY
    // ================================================================

    const tavilyKey =
      process.env.TAVILY_API_KEY;

    if (!tavilyKey) {
      console.error(
        '❌ [Tavily Error] Missing TAVILY_API_KEY in server/.env'
      );

      return {
        error:
          'TAVILY_API_KEY is missing in server/.env. Please configure it.',
      };
    }

    // ================================================================
    // 3. DETECT TIME-SENSITIVE QUERIES
    // ================================================================

    const lowerQuery =
      cleanQuery.toLowerCase();

    const freshnessPatterns = [
      /\blatest\b/,
      /\bcurrent\b/,
      /\bcurrently\b/,
      /\bright now\b/,
      /\btoday\b/,
      /\bthis week\b/,
      /\bthis month\b/,
      /\bthis year\b/,
      /\brecent\b/,
      /\bmost recent\b/,
      /\bnewest\b/,
      /\bwho won\b/,
      /\bwinner\b/,
      /\bchampion\b/,
      /\bchampions\b/,
      /\bchampionship\b/,
      /\bfinal\b/,
      /\bresults?\b/,
      /\bscore\b/,
      /\bstandings?\b/,
      /\baward\b/,
      /\bawards\b/,
      /\belection\b/,
      /\belected\b/,
      /\bpresident\b/,
      /\bprime minister\b/,
      /\bceo\b/,
      /\bleader\b/,
      /\bnews\b/,
      /\bupdate\b/,
      /\bupdates\b/,
      /\brelease\b/,
      /\breleased\b/,
      /\bversion\b/,
      /\bprice\b/,
      /\bprices\b/,
      /\bstock\b/,
      /\bschedule\b/,
    ];

    const isFreshnessSensitive =
      freshnessPatterns.some(
        (pattern) =>
          pattern.test(lowerQuery)
      );

    const isSportsQuery =
      /\bsuper bowl\b/.test(
        lowerQuery
      ) ||
      /\bnfl\b/.test(
        lowerQuery
      ) ||
      /\bnba\b/.test(
        lowerQuery
      ) ||
      /\bmlb\b/.test(
        lowerQuery
      ) ||
      /\bnhl\b/.test(
        lowerQuery
      ) ||
      /\bworld cup\b/.test(
        lowerQuery
      ) ||
      /\bchampion\b/.test(
        lowerQuery
      ) ||
      /\bchampionship\b/.test(
        lowerQuery
      ) ||
      /\btournament\b/.test(
        lowerQuery
      ) ||
      /\bfinal\b/.test(
        lowerQuery
      ) ||
      /\bmatch\b/.test(
        lowerQuery
      ) ||
      /\bgame\b/.test(
        lowerQuery
      );

    const isNewsQuery =
      /\bnews\b/.test(
        lowerQuery
      ) ||
      /\blatest\b/.test(
        lowerQuery
      ) ||
      /\brecent\b/.test(
        lowerQuery
      ) ||
      /\bupdate\b/.test(
        lowerQuery
      ) ||
      /\bupdates\b/.test(
        lowerQuery
      ) ||
      /\bcurrent events\b/.test(
        lowerQuery
      );

    // ================================================================
    // 4. CURRENT DATE
    // ================================================================

    const now = new Date();

    const currentDate =
      now.toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      );

    const currentYear =
      now.getFullYear();

    // ================================================================
    // 5. FRESHNESS-AWARE QUERY
    // ================================================================

    let searchQuery =
      cleanQuery;

    if (
      isFreshnessSensitive
    ) {
      const queryHasYear =
        /\b20\d{2}\b/.test(
          searchQuery
        );

      const queryHasFreshnessMarker =
        /\b(latest|current|currently|today|recent|newest|most recent)\b/i.test(
          searchQuery
        );

      // Do NOT inject an old year.
      //
      // If the query already has a specific year, preserve it.
      //
      // If it is asking for the current state but doesn't have
      // a freshness marker, append one.
      if (
        !queryHasFreshnessMarker
      ) {
        searchQuery +=
          ` current latest ${currentYear}`;
      } else if (
        !queryHasYear
      ) {
        // Adding the current year helps search engines surface
        // current information without replacing the user's query.
        searchQuery +=
          ` ${currentYear}`;
      }
    }

    // ================================================================
    // 6. DETERMINE TAVILY SEARCH MODE
    // ================================================================

    let topic:
      | 'general'
      | 'news' = 'general';

    if (
      isNewsQuery ||
      isSportsQuery
    ) {
      topic = 'news';
    }

    // ================================================================
    // 7. DETERMINE FRESHNESS WINDOW
    // ================================================================

    let timeRange:
      | 'day'
      | 'week'
      | 'month'
      | 'year'
      | undefined;

    // Explicit user-provided Tavily setting wins.
    if (
      args?.time_range
    ) {
      timeRange =
        args.time_range;
    } else if (
      isFreshnessSensitive
    ) {
      /*
       * We intentionally do NOT always use "day".
       *
       * A question like:
       * "Who won the latest Super Bowl?"
       *
       * might refer to an event that happened months ago.
       *
       * "year" gives Tavily a freshness preference without
       * accidentally excluding the actual event.
       */
      timeRange = 'year';
    }

    // ================================================================
    // 8. LOG SEARCH INTENT
    // ================================================================

    console.log(
      `🌐 [Live Web Search] Tavily query: "${searchQuery}"`
    );

    console.log(
      `🕐 [Freshness Policy] sensitive=${isFreshnessSensitive}, topic=${topic}, time_range=${timeRange || 'none'}`
    );

    try {
      // ==============================================================
      // 9. TAVILY REQUEST
      // ==============================================================

      const requestBody: Record<
        string,
        any
      > = {
        api_key:
          tavilyKey,

        query:
          searchQuery,

        search_depth:
          'advanced',

        topic,

        include_answer:
          true,

        include_raw_content:
          false,

        max_results:
          isFreshnessSensitive
            ? 8
            : 5,
      };

      // Tavily accepts time_range as an optional parameter.
      if (timeRange) {
        requestBody.time_range =
          timeRange;
      }

      const res =
        await fetch(
          'https://api.tavily.com/search',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                requestBody
              ),

            signal:
              AbortSignal.timeout(
                10000
              ),
          }
        );

      // ==============================================================
      // 10. HANDLE TAVILY HTTP ERRORS
      // ==============================================================

      if (!res.ok) {
        const errBody =
          await res.text();

        throw new Error(
          `Tavily HTTP ${res.status}: ${errBody}`
        );
      }

      const data =
        await res.json();

      // ==============================================================
      // 11. PROCESS RESULTS
      // ==============================================================

      const rawResults =
        Array.isArray(
          data.results
        )
          ? data.results
          : [];

      /*
       * Keep more records internally for the model.
       *
       * The old implementation immediately sliced to 3.
       * That makes it much easier for one stale result to dominate.
       */
      const results =
        rawResults
          .slice(0, 8)
          .map(
            (
              r: any,
              index: number
            ) => {
              let cleanContent =
                (
                  r.content ||
                  r.raw_content ||
                  ''
                )
                  .replace(
                    /\s+/g,
                    ' '
                  )
                  .trim();

              /*
               * 350 characters can be too aggressive for
               * temporal questions because the date/winner
               * information may appear later in the snippet.
               *
               * Keep 700 characters.
               */
              if (
                cleanContent.length >
                700
              ) {
                cleanContent =
                  cleanContent.slice(
                    0,
                    700
                  ) + '...';
              }

              return {
                rank:
                  index + 1,

                title:
                  r.title ||
                  null,

                url:
                  r.url ||
                  null,

                snippet:
                  cleanContent,

                publishedDate:
                  r.published_date ||
                  r.publishedDate ||
                  null,

                score:
                  typeof r.score ===
                  'number'
                    ? r.score
                    : null,
              };
            }
          );

      // ================================================================
      // 12. TEMPORAL METADATA FOR THE AGENT
      // ================================================================

      const temporalGuidance =
        isFreshnessSensitive
          ? {
              freshnessRequired:
                true,

              searchDate:
                currentDate,

              currentYear,

              searchTopic:
                topic,

              timeRange:
                timeRange ||
                null,

              instruction:
                'For current/latest questions, distinguish article publication date from event date. Do not treat an old historical article as the current answer merely because it is relevant.',
            }
          : {
              freshnessRequired:
                false,

              searchDate:
                currentDate,

              currentYear,
            };

      // ================================================================
      // 13. TAVILY DIRECT ANSWER
      // ================================================================

      const directAnswer =
        data.answer ||
        null;

      console.log(
        `✅ [Tavily AI] Retrieved ${results.length} records | Freshness-sensitive: ${isFreshnessSensitive}`
      );

      // ================================================================
      // 14. RETURN GROUNDED SEARCH RESULT
      // ================================================================

      return {
        query:
          cleanQuery,

        executedQuery:
          searchQuery,

        directAnswer,

        temporalContext:
          temporalGuidance,

        results,
      };
    } catch (
      err: any
    ) {
      console.error(
        `[Tavily Search Error]`,
        err
      );

      return {
        error:
          `Tavily search failed: ${err.message}`,
      };
    }
  },
} as any),


  // TOOL 4: REAL-TIME GLOBAL WEATHER
  get_weather: tool({
    description: 'Get real-time live weather conditions, temperature, humidity, and wind speed for any city worldwide.',
    parameters: z.object({
      city: z.string().optional().describe('City name (e.g., "Lima", "Paris", "Tokyo")'),
      location: z.string().optional(),
      units: z.string().optional(),
    }),
    execute: async (rawArgs: any) => {
      let args = rawArgs;
      if (typeof rawArgs === 'string') {
        try {
          args = JSON.parse(rawArgs);
        } catch {
          args = { city: rawArgs };
        }
      }

      let city =
        args?.city ||
        args?.location ||
        args?.place ||
        args?.query ||
        args?.name;

      if (typeof city === 'object' && city !== null) {
        city = city.name || city.city || city.value || '';
      }

      if (!city && typeof rawArgs === 'string' && rawArgs.length > 0) {
        city = rawArgs;
      }

      if (!city || typeof city !== 'string' || city.trim().length === 0) {
        return { error: 'A valid city name is required to fetch weather.' };
      }

      const cleanCity = city.trim().replace(/^in\s+/i, '');
      console.log(`⛅ [Weather Tool] Geocoding & fetching weather for: "${cleanCity}"`);

      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          cleanCity
        )}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'MULTILLM-Agent/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!geoRes.ok) throw new Error(`Geocoding failed with status ${geoRes.status}`);

        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          return { error: `City "${cleanCity}" could not be found.` };
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`;
        const weatherRes = await fetch(weatherUrl, {
          headers: { 'User-Agent': 'MULTILLM-Agent/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!weatherRes.ok) throw new Error(`Weather service returned HTTP ${weatherRes.status}`);

        const weatherData = await weatherRes.json();
        const current = weatherData.current;

        const weatherCodeMap: Record<number, string> = {
          0: 'Clear sky',
          1: 'Mainly clear',
          2: 'Partly cloudy',
          3: 'Overcast',
          45: 'Foggy',
          51: 'Light drizzle',
          61: 'Slight rain',
          63: 'Moderate rain',
          65: 'Heavy rain',
          71: 'Slight snow',
          75: 'Heavy snow',
          80: 'Rain showers',
          95: 'Thunderstorm',
        };

        const condition = weatherCodeMap[current.weather_code] || 'Variable conditions';
        const tempC = Math.round(current.temperature_2m);
        const tempF = Math.round((tempC * 9) / 5 + 32);

        return {
          city: `${name}, ${country}`,
          temperature_C: `${tempC}°C`,
          temperature_F: `${tempF}°F`,
          feels_like_C: `${Math.round(current.apparent_temperature)}°C`,
          condition,
          humidity: `${current.relative_humidity_2m}%`,
          wind_speed: `${current.wind_speed_10m} km/h`,
        };
      } catch (err: any) {
        console.error(`[Weather Tool Error]`, err);
        return { error: `Weather service unavailable: ${err.message}` };
      }
    },
  } as any),

  // TOOL 5: SEMANTIC DOCUMENT RAG (Neon pgvector Cosine Similarity)
  search_documents: tool({
    description: 'Search through uploaded company documents, PDF extracts, text files, and notes using semantic vector similarity in PostgreSQL.',
    parameters: z.object({
      query: z.string().describe('The concept, question, or keyword to match against uploaded documents'),
    }),
    execute: async ({ query }: { query: string }) => {
      console.log(`📚 [RAG Tool] Searching uploaded documents for: "${query}"`);
      try {
        const matches = await searchSimilarChunks(query, 3);
        if (!matches || matches.length === 0) {
          return {
            query,
            message: 'No matching records found in uploaded documents. Suggest uploading relevant files first.',
          };
        }

        return {
          query,
          matchedChunks: matches.map((m) => ({
            sourceDocument: m.filename,
            relevanceScore: m.similarity ? `${Math.round(m.similarity * 100)}%` : 'N/A',
            excerpt: m.content,
          })),
        };
      } catch (err: any) {
        console.error('❌ [RAG Tool Error]', err);
        return { error: `Document search failed: ${err.message}` };
      }
    },
  } as any),
};


// 3. DYNAMICALLY REGISTER REMOTE MCP TOOLS ON STARTUP
// 🛡️ TEST RUNNER GUARD: Do not spawn background MCP child process during unit testing (prevents EPIPE)
if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
  initMcpClient()
    .then((mcpTools) => {
      Object.assign(projectTools, mcpTools);
      console.log(`⚡ [Tool Registry] Extensible suite loaded. Active tools: [${Object.keys(projectTools).join(', ')}]`);
    })
    .catch((err) => {
      console.warn('⚠️ [Tool Registry] MCP dynamic loading notice:', err.message);
    });
}
export { isPathSafe };