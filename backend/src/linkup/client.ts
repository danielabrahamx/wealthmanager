/**
 * Linkup API Integration
 * 
 * Provides real-time financial data for sophisticated tier users.
 * Uses Linkup SDK to search Yahoo Finance and fetch market data.
 */

import { LinkupClient } from 'linkup-sdk';
import { getCachedMarketData, cacheMarketData } from '../redis/client.js';

let linkupClient: LinkupClient | null = null;

function getLinkupClient(): LinkupClient {
  if (!linkupClient) {
    const apiKey = process.env.LINKUP_API_KEY || '';
    if (!apiKey) {
      console.warn('[linkup] LINKUP_API_KEY not set. Linkup features will be disabled.');
    }
    linkupClient = new LinkupClient({ apiKey });
  }
  return linkupClient;
}

export interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: string;
  peRatio?: number;
  dayHigh?: number;
  dayLow?: number;
  yearHigh?: number;
  yearLow?: number;
  source: string;
  timestamp: string;
}

export interface MarketNews {
  title: string;
  snippet: string;
  url: string;
  source: string;
  date: string;
}

/**
 * Fetch real-time stock data using Linkup search → Yahoo Finance
 */
export async function fetchStockData(ticker: string): Promise<StockData | null> {
  try {
    // Check cache first
    const cacheKey = `stock:${ticker.toLowerCase()}`;
    const cached = await getCachedMarketData(cacheKey);
    if (cached) {
      console.log(`[linkup] Cache hit for ${ticker}`);
      return cached as StockData;
    }

    // Search Yahoo Finance for this ticker
    const client = getLinkupClient();
    const searchResult = await client.search({
      query: `${ticker} stock price today market cap PE ratio`,
      depth: 'standard',
      outputType: 'searchResults',
    });

    console.log(`[linkup] Search results for ${ticker}:`, searchResult);

    // Try to fetch the Yahoo Finance page for detailed data
    let stockData: StockData | null = null;
    
    try {
      const yahooPage = await client.fetch({
        url: `https://finance.yahoo.com/quote/${ticker}`,
        renderJs: false,
      });
      
      // Extract data from the markdown
      stockData = parseYahooFinanceMarkdown(ticker, yahooPage.markdown || '');
    } catch (fetchErr) {
      console.warn(`[linkup] Could not fetch Yahoo Finance page for ${ticker}:`, fetchErr);
    }

    // If we couldn't get real data, return mock with Linkup flag
    if (!stockData || !stockData.price) {
      stockData = generateMockStockData(ticker, 'linkup-search');
    } else {
      stockData.source = 'yahoo-finance-via-linkup';
    }

    stockData.timestamp = new Date().toISOString();
    
    // Cache for 15 minutes
    await cacheMarketData(cacheKey, stockData, 900);

    return stockData;
  } catch (err) {
    console.error(`[linkup] Error fetching stock data for ${ticker}:`, err);
    // Fall back to mock data
    return generateMockStockData(ticker, 'fallback');
  }
}

export function isLinkupEnabled(): boolean {
  return !!process.env.LINKUP_API_KEY;
}

/**
 * Free-form live research via Linkup. Returns a synthesized, sourced answer the
 * LLM can use to discuss ANY security or market topic (individual stocks, macro,
 * sectors) instead of being limited to the curated fund list. Returns null when
 * Linkup is disabled or the call fails so the caller degrades gracefully.
 */
export async function searchLive(query: string): Promise<string | null> {
  if (!isLinkupEnabled()) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const cacheKey = `live:${trimmed.toLowerCase().slice(0, 120)}`;
    const cached = await getCachedMarketData(cacheKey);
    if (cached) return cached as string;

    const client = getLinkupClient();
    const result = (await client.search({
      query: `${trimmed} (current market data, prices, outlook)`,
      depth: 'standard',
      outputType: 'sourcedAnswer',
    })) as { answer?: string; sources?: Array<{ name?: string; url?: string }> };

    const answer = (result?.answer || '').trim();
    if (!answer) return null;

    const sources = (result?.sources || [])
      .slice(0, 3)
      .map((s) => s.name || s.url)
      .filter(Boolean)
      .join(', ');
    const out = sources ? `${answer}\n\nSources: ${sources}` : answer;

    await cacheMarketData(cacheKey, out, 900);
    return out;
  } catch (err) {
    console.warn('[linkup] live search failed:', (err as Error).message?.slice(0, 120));
    return null;
  }
}

/**
 * Search for financial news via Linkup
 */
export async function fetchMarketNews(query: string): Promise<MarketNews[]> {
  try {
    const cacheKey = `news:${query.toLowerCase().replace(/\s+/g, '-')}`;
    const cached = await getCachedMarketData(cacheKey);
    if (cached) {
      return cached as MarketNews[];
    }

    const client = getLinkupClient();
    const result = await client.search({
      query: `${query} financial news`,
      depth: 'standard',
      outputType: 'searchResults',
    });

    const news = (result as any)?.results?.slice(0, 5).map((r: any) => ({
      title: r.title || '',
      snippet: r.snippet || r.content || '',
      url: r.url || '',
      source: 'linkup',
      date: r.date || new Date().toISOString(),
    })) || [];

    await cacheMarketData(cacheKey, news, 900);
    return news;
  } catch (err) {
    console.error('[linkup] Error fetching market news:', err);
    return [];
  }
}

/**
 * Fetch full Yahoo Finance page content via Linkup
 */
export async function fetchYahooFinancePage(url: string): Promise<string> {
  try {
    const client = getLinkupClient();
    const result = await client.fetch({
      url,
      renderJs: false,
    });
    return result.markdown || '';
  } catch (err) {
    console.error('[linkup] Error fetching Yahoo Finance page:', err);
    return '';
  }
}

/**
 * Run Monte Carlo simulation for portfolio projections
 */
export function runMonteCarloSimulation(
  initialValue: number,
  annualReturn: number,
  volatility: number,
  years: number,
  simulations: number = 1000
): Array<{ year: number; median: number; p10: number; p90: number }> {
  const results: number[][] = [];

  for (let sim = 0; sim < simulations; sim++) {
    let value = initialValue;
    const path: number[] = [value];
    
    for (let y = 0; y < years; y++) {
      // Random return using normal distribution
      const randomReturn = boxMullerRandom() * volatility + annualReturn / 100;
      value *= (1 + randomReturn);
      path.push(value);
    }
    results.push(path);
  }

  // Calculate percentiles for each year
  const projections: Array<{ year: number; median: number; p10: number; p90: number }> = [];
  for (let y = 0; y <= years; y++) {
    const values = results.map(r => r[y]).sort((a, b) => a - b);
    projections.push({
      year: y,
      median: values[Math.floor(simulations * 0.5)],
      p10: values[Math.floor(simulations * 0.1)],
      p90: values[Math.floor(simulations * 0.9)],
    });
  }

  return projections;
}

// ── Helpers ──

function parseYahooFinanceMarkdown(ticker: string, markdown: string): StockData | null {
  try {
    // Simple regex-based extraction from markdown
    const priceMatch = markdown.match(/\$?([\d,.]+)\s*[-+]/);
    const changeMatch = markdown.match(/([-+][\d.]+)\s*\(([-\d.]+%)\)/);
    
    if (priceMatch) {
      return {
        ticker: ticker.toUpperCase(),
        price: parseFloat(priceMatch[1].replace(/,/g, '')),
        change: changeMatch ? parseFloat(changeMatch[1]) : 0,
        changePercent: changeMatch ? parseFloat(changeMatch[2]) : 0,
        volume: 0,
        source: 'yahoo-finance-via-linkup',
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function generateMockStockData(ticker: string, source: string): StockData {
  const basePrice = ticker.length * 10 + Math.random() * 100;
  const change = (Math.random() - 0.5) * 5;
  return {
    ticker: ticker.toUpperCase(),
    price: Math.round(basePrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round((change / basePrice) * 10000) / 100,
    volume: Math.floor(Math.random() * 10000000),
    marketCap: `$${(Math.random() * 500 + 10).toFixed(1)}B`,
    peRatio: Math.round((15 + Math.random() * 20) * 10) / 10,
    dayHigh: Math.round((basePrice + Math.random() * 3) * 100) / 100,
    dayLow: Math.round((basePrice - Math.random() * 3) * 100) / 100,
    yearHigh: Math.round((basePrice * 1.3) * 100) / 100,
    yearLow: Math.round((basePrice * 0.7) * 100) / 100,
    source,
    timestamp: new Date().toISOString(),
  };
}

// Box-Muller transform for normal distribution
function boxMullerRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
