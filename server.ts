import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Gemini SDK lazily
let ai: GoogleGenAI | null = null;
function getGeminiSDK() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Scrape text content from a given URL safely
async function scrapeUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Simple text extraction from HTML to avoid pulling massive heavy libraries
    // Strip script and style tags
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Strip remaining HTML tags
      .replace(/\s+/g, ' ')     // Collapse whitespace
      .trim();
      
    // Truncate to first 12,000 chars to avoid overloading tokens in a simple fetch
    if (text.length > 12000) {
      text = text.substring(0, 12000) + '... [truncated]';
    }
    
    return text || 'No readable text content found.';
  } catch (err: any) {
    console.error(`Error scraping URL ${url}:`, err.message);
    return `Failed to fetch or read content from URL: ${err.message}`;
  }
}

// Endpoint for autonomous research
app.post('/api/research', async (req: Request, res: Response) => {
  const { topic, customUrls } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Topic is required and must be a string.' });
  }

  try {
    const sdk = getGeminiSDK();
    
    // We will build a structured response including logs, sources, and the report.
    const logs: Array<{ timestamp: string; stage: string; message: string }> = [];
    const addLog = (stage: string, message: string) => {
      logs.push({ timestamp: new Date().toISOString(), stage, message });
    };

    addLog('analyze', `Initiating autonomous research agent for topic: "${topic}"`);

    let scrapedContext = '';
    const sources: Array<{ title: string; url: string; snippet: string; domain: string; queryMatched?: string }> = [];

    // If the user specified specific URLs to search/scrape
    if (customUrls && Array.isArray(customUrls) && customUrls.length > 0) {
      addLog('search', `User specified ${customUrls.length} custom source URL(s). Scraping directly...`);
      
      for (const url of customUrls) {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) continue;
        addLog('search', `Scraping: ${url}`);
        const text = await scrapeUrl(url);
        const domain = new URL(url).hostname;
        
        scrapedContext += `\n--- Content from ${url} ---\n${text}\n`;
        sources.push({
          title: `Direct Scraped Resource (${domain})`,
          url,
          snippet: text.substring(0, 250) + '...',
          domain,
          queryMatched: 'Direct URL Scrape'
        });
      }
    }

    addLog('analyze', 'Formulating search strategies and query expansions based on the topic...');
    
    // Query expansion step using Gemini to get the best queries
    const plannerPrompt = `You are an AI research planner. The user wants to research the topic: "${topic}".
Generate 2 to 3 distinct search queries that would yield the most comprehensive, up-to-date, and diverse information for this research topic.
Return ONLY a valid JSON array of strings. Do not include markdown code block styling, just the raw JSON.
Example: ["query 1", "query 2"]`;

    const plannerResponse = await sdk.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: plannerPrompt,
    });

    let queries: string[] = [];
    try {
      const cleanedText = (plannerResponse.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
      queries = JSON.parse(cleanedText);
      if (!Array.isArray(queries)) {
        queries = [topic];
      }
    } catch (e) {
      queries = [topic, `${topic} news 2026`, `${topic} analysis trends`].slice(0, 3);
    }

    addLog('search', `Formulated search queries: ${queries.map(q => `"${q}"`).join(', ')}`);

    // Let's call Gemini with Google Search Grounding to do the deep research and synthesize
    addLog('search', `Executing searches with Google Search Grounding to pull live data from external sources...`);

    // We do a final comprehensive prompt for the researcher, enabling googleSearch tool
    const researchPrompt = `You are an autonomous AI research agent.
Your objective is to build a highly professional, pristine, structured, and deep research report on: "${topic}".

${scrapedContext ? `Here is the custom scraped content provided by the user for reference:
${scrapedContext}
Please integrate this scraped content with your web searches.` : ''}

Please perform extensive searches to cover all facets of this topic.
Then, generate a well-structured markdown report containing:
1. # Title (A descriptive, high-quality title)
2. ## Executive Summary (A precise and professional overview)
3. ## Important Findings (A detailed list of key findings with bullet points)
4. ## Detailed Analysis (In-depth background, industry context, engineering/scientific challenges, and perspectives)
5. ## Actionable Insights (3-4 highly specific, realistic action items/next steps)
6. ## References & Sources (A list of references with links and titles gathered from your search)

Do not use hardcoded responses, predefined rules, or fake sources. The sources MUST reflect actual URLs retrieved from the search results.`;

    const researcherResponse = await sdk.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: researchPrompt,
      config: {
        tools: [{ googleSearch: {} }] // Enable search grounding!
      }
    });

    addLog('deduplicate', 'Removing duplicate references, validating domains, and filtering irrelevant content...');

    // Extract grounding metadata to construct our Sources list
    const groundingMetadata = researcherResponse.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && groundingMetadata.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk) => {
        if (chunk.web?.uri) {
          const title = chunk.web.title || 'Web Resource';
          const url = chunk.web.uri;
          try {
            const domain = new URL(url).hostname;
            // Check if already exists in sources
            if (!sources.some(s => s.url === url)) {
              sources.push({
                title,
                url,
                snippet: chunk.web.title || 'Relevant search reference.',
                domain,
                queryMatched: topic
              });
            }
          } catch (e) {
            // Invalid URL
          }
        }
      });
    }

    addLog('synthesize', `Synthesizing ${sources.length} sources and drafting structured Markdown report...`);
    addLog('synthesize', `Applying precise styling, headers, and bulleted layouts...`);

    let report = researcherResponse.text || '';

    // Append sources explicitly if they aren't fully listed in the markdown, or format nicely
    if (sources.length > 0 && !report.toLowerCase().includes('references') && !report.toLowerCase().includes('sources')) {
      report += '\n\n## References & Sources\n';
      sources.forEach((src, idx) => {
        report += `${idx + 1}. [${src.title}](${src.url}) - Domain: ${src.domain}\n`;
      });
    }

    addLog('complete', 'Research report compiled and exported successfully.');

    return res.json({
      success: true,
      queries,
      sources,
      logs,
      report
    });

  } catch (err: any) {
    console.error('Error during autonomous research:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An error occurred during the research process.',
      logs: [
        { timestamp: new Date().toISOString(), stage: 'error', message: `Critical error: ${err.message}` }
      ]
    });
  }
});

// Serve Vite build static files in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// In dev mode, or if fallback, handle all SPA client routing
app.get('*', (req: Request, res: Response, next) => {
  // If requesting api, let it pass through
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Serve built index.html in production
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html doesn't exist yet (dev server), let it be handled by Vite
      res.status(404).send('Vite Dev Server is running. Please open the app via the Development URL.');
    }
  });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Autonomous Research Agent server running on port ${PORT}`);
});
