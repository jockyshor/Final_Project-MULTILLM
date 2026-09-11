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

// 2. EXPORT MCP TOOLS
export const projectTools = {
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
        // Prune file content to 4000 chars to protect TPM limits
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
  browse_web: tool({
    description: 'Search the live global internet for real-time news, sports match results, scores, champions, and current facts.',
    parameters: z.object({
      query: z.string().describe('Search query for live web search (e.g., "who won the last super bowl", "latest news")'),
      topic: z.string().optional(),
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

      let query = args?.query || args?.topic || args?.search || args?.q;
      if (typeof query === 'object' && query !== null) {
        query = query.query || query.topic || JSON.stringify(query);
      }

      if (!query || typeof query !== 'string') {
        return { error: 'Search query is required.' };
      }

      const cleanQuery = query.replace(/["'“”]/g, '').trim();
      const tavilyKey = process.env.TAVILY_API_KEY;

      if (!tavilyKey) {
        console.error('❌ [Tavily Error] Missing TAVILY_API_KEY in server/.env');
        return { error: 'TAVILY_API_KEY is missing in server/.env. Please configure it.' };
      }

      console.log(`🌐 [Live Web Search] Querying Tavily AI: "${cleanQuery}"`);

      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: cleanQuery,
            search_depth: 'advanced',
            include_answer: true,
            max_results: 3,
          }),
          signal: AbortSignal.timeout(9000),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Tavily HTTP ${res.status}: ${errBody}`);
        }

        const data = await res.json();

        // 🛡️ TOKEN OPTIMIZATION: Truncate snippets to 350 chars each to stay safely within Groq's 8,000 TPM limit
        const results = (data.results || []).slice(0, 3).map((r: any) => {
          let cleanContent = (r.content || '').replace(/\s+/g, ' ').trim();
          if (cleanContent.length > 350) {
            cleanContent = cleanContent.slice(0, 350) + '...';
          }
          return {
            title: r.title,
            snippet: cleanContent,
            url: r.url,
          };
        });

        console.log(`✅ [Tavily AI] Retrieved ${results.length} token-compressed live records.`);

        return {
          query: cleanQuery,
          directAnswer: data.answer || null,
          results,
        };
      } catch (err: any) {
        console.error(`[Tavily Search Error]`, err);
        return { error: `Tavily search failed: ${err.message}` };
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
};

export { isPathSafe };