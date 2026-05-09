// packages/ai-chart-analyzer/src/Analyzer.ts
export interface AnalysisResult {
  trends: string[];
  supportLevels: number[];
  resistanceLevels: number[];
  patterns: string[]; // e.g., "head and shoulders", "double bottom"
  confidence: number;
}

export class AIChatAnalyzer {
  async analyzeChart(imageBuffer: Buffer): Promise<AnalysisResult> {
    const cacheKey = this.hashImage(imageBuffer);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Call Finelo's existing AI endpoint (or pluggable LLM)
    const result = await this.aiClient.post("/analyze", { image: imageBuffer.toString("base64") });
    await this.cache.set(cacheKey, result.data);
    return result.data;
  }
}
