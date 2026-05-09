import { 
  AnalysisResult, 
  ChartPattern, 
  TrendDirection, 
  SupportResistanceLevel,
  PatternType,
  PatternConfidence,
  TimeFrame,
  AnalysisCacheEntry,
  ChartImageData
} from './types.js';
import crypto from 'crypto';

export class AIChartAnalyzer {
  private cache: Map<string, AnalysisCacheEntry> = new Map();
  private apiEndpoint: string;
  private apiKey: string;

  constructor(apiEndpoint?: string, apiKey?: string) {
    this.apiEndpoint = apiEndpoint || process.env.AI_ANALYZER_ENDPOINT || 'https://api.finelo.ai/analyze';
    this.apiKey = apiKey || process.env.AI_ANALYZER_API_KEY || '';
  }

  private hashImage(imageBuffer: Buffer): string {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  private getCachedAnalysis(hash: string): AnalysisResult | null {
    const cached = this.cache.get(hash);
    if (cached && cached.expiresAt > new Date()) {
      return cached.result;
    }
    if (cached) {
      this.cache.delete(hash);
    }
    return null;
  }

  private setCachedAnalysis(hash: string, result: AnalysisResult): void {
    const cacheEntry: AnalysisCacheEntry = {
      result,
      cachedAt: new Date(),
      expiresAt: result.expiresAt
    };
    this.cache.set(hash, cacheEntry);
    
    // Clean up old cache entries periodically (simplified)
    if (this.cache.size > 100) {
      const now = new Date();
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }
  }

  async analyzeChart(
    imageData: ChartImageData,
    symbol: string,
    timeframe: TimeFrame = TimeFrame.ONE_DAY
  ): Promise<AnalysisResult> {
    const imageHash = this.hashImage(imageData.buffer);
    const cached = this.getCachedAnalysis(imageHash);
    
    if (cached && cached.symbol === symbol && cached.timeframe === timeframe) {
      console.log(`Returning cached analysis for ${symbol} from ${cached.timestamp}`);
      return cached;
    }

    // Simulate AI analysis (in production, call actual AI service)
    const result = await this.performAIAnalysis(imageData, symbol, timeframe);
    
    this.setCachedAnalysis(imageHash, result);
    return result;
  }

  private async performAIAnalysis(
    imageData: ChartImageData,
    symbol: string,
    timeframe: TimeFrame
  ): Promise<AnalysisResult> {
    // This simulates the AI analysis
    // In production, this would call OpenAI Vision API or a custom model
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

    const currentPrice = this.getMockPrice(symbol);
    const trend = this.determineMockTrend(symbol);
    
    return {
      symbol,
      timeframe,
      currentPrice,
      trend,
      trendStrength: Math.floor(Math.random() * 40) + 60,
      supportLevels: this.generateSupportLevels(currentPrice),
      resistanceLevels: this.generateResistanceLevels(currentPrice),
      patterns: this.detectMockPatterns(currentPrice, trend),
      indicators: this.calculateIndicators(symbol, currentPrice),
      summary: this.generateSummary(symbol, trend, currentPrice),
      recommendation: this.determineRecommendation(trend),
      confidence
