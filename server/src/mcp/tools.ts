import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// 1. DEFINE SANDBOX BOUNDARY (Project Root)
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PROTECTED_PATTERNS = ['.env', '.git', 'node_modules'];

function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, targetPath);
  if (!resolved.startsWith(PROJECT_ROOT)) return false;
  return !PROTECTED_PATTERNS.some(pattern => resolved.includes(pattern));
}

// 2. EXPORT MCP TOOLS (Filesystem + Live Internet + Open-Meteo Weather)
export const projectTools = {
  // TOOL 1: list_directory
  list_directory: tool({
    description: 'List files and directories within a given project folder to explore the codebase structure.',
    parameters: z.object({
      directoryPath: z.string().optional().describe('Relative folder path from project root (e.g., "." or "server/src")'),
    }),
    execute: async (args: any) => {
      const dirPath = args?.directoryPath || '.';
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
      filePath: z.string().describe('Relative path to the file from project root (e.g., "server/package.json")'),
    }),
    execute: async (args: any) => {
      const rawPath = args?.filePath || args?.path || args?.file || 'server/package.json';
      console.log(`🔧 [Tool Execution] read_file("${rawPath}")`);

      if (!isPathSafe(rawPath)) {
        return { error: 'Access Denied: Path is outside project sandbox or accesses protected files (.env).' };
      }

      const fullPath = path.resolve(PROJECT_ROOT, rawPath);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const truncated = content.length > 8000 ? content.slice(0, 8000) + '\n...[Truncated]' : content;
        return {
          filePath: rawPath,
          content: truncated,
        };
      } catch (err: any) {
        return { error: `Failed to read file "${rawPath}": ${err.message}` };
      }
    },
  } as any),

  // TOOL 3: LIVE WEB SEARCH (DuckDuckGo Instant Knowledge API)
// TOOL 3: LIVE FACT & WEB SEARCH (Wikipedia Full-Text Engine - Zero Key, High Reliability)
  web_search: tool({
    description: 'Search for verified real-world facts, history, sports, public figures, musical artists, and world events.',
    parameters: z.object({
      query: z.string().describe('Search query or topic (e.g., "FIFA World Cup winners", "Chappell Roan", "OpenAI")'),
    }),
    execute: async (rawArgs: any) => {
      let args = rawArgs;
      if (typeof rawArgs === 'string') {
        try {
          args = JSON.parse(rawArgs);
        } catch {
          args = { query: rawArgs };
        }
      }

      let query = args?.query || args?.q || args?.search;
      if (typeof query === 'object' && query !== null) {
        query = query.query || query.q || JSON.stringify(query);
      }

      if (!query || typeof query !== 'string') {
        return { error: 'Search query is required.' };
      }

      const cleanQuery = query.trim();
      console.log(`🌐 [Live Web Search] Querying: "${cleanQuery}"`);

      try {
        // Step A: Full-text search across live Wikipedia knowledge base
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*`;
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'MULTILLM-Agent/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) throw new Error(`Search API returned status ${res.status}`);

        const data = await res.json();
        const searchResults = data?.query?.search;

        if (!searchResults || searchResults.length === 0) {
          return {
            query: cleanQuery,
            message: `No verified records found for "${cleanQuery}".`,
          };
        }

        // Clean HTML tags (<span class="searchmatch">...</span>) from snippets
        const results = searchResults.slice(0, 3).map((item: any) => ({
          title: item.title,
          snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
          pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
        }));

        return { query: cleanQuery, results };
      } catch (err: any) {
        console.error(`[Web Search Error]`, err);
        return { error: `Web search service error: ${err.message}` };
      }
    },
  } as any),
  // TOOL 4: REAL-TIME GLOBAL WEATHER (Open-Meteo Engine - Zero Key, High Reliability)
  get_weather: tool({
    description: 'Get real-time live weather conditions, temperature, humidity, and wind speed for any city worldwide.',
    parameters: z.object({
      city: z.string().describe('The name of the city (e.g., "Lima", "Paris", "Tokyo", "New York")'),
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
        // Step A: Geocode city name to coordinates
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'MULTILLM-Agent/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!geoRes.ok) {
          throw new Error(`Geocoding service returned status ${geoRes.status}`);
        }

        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          return { error: `City "${cleanCity}" could not be found. Please verify spelling.` };
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // Step B: Query live weather metrics
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`;
        const weatherRes = await fetch(weatherUrl, {
          headers: { 'User-Agent': 'MULTILLM-Agent/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!weatherRes.ok) {
          throw new Error(`Weather metrics service returned status ${weatherRes.status}`);
        }

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
};

export { isPathSafe };

