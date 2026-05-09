import { describe, it, expect, beforeEach } from 'vitest';
import { AIChartAnalyzer } from '../src/Analyzer.js';
import { TimeFrame, TrendDirection } from '../src/types.js';

describe('AIChartAnalyzer', () => {
  let analyzer: AIChartAnalyzer;
  const mockImageBuffer = Buffer.from('fake-image-data');
  const testSymbol = 'AAPL';

  beforeEach(() => {
    analyzer = new AIChartAnalyzer();
  });

  it('should analyze chart and return result', async () => {
    const result = await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    expect(result).toBeDefined();
    expect(result.symbol).toBe(testSymbol);
    expect(result.timeframe).toBe(TimeFrame.ONE_DAY);
    expect(result.currentPrice).toBeGreaterThan(0);
    expect(result.trend).toBeDefined();
    expect(result.supportLevels.length).toBeGreaterThan(0);
    expect(result.resistanceLevels.length).toBeGreaterThan(0);
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });

  it('should cache analysis results', async () => {
    const firstResult = await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    const secondResult = await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    // Should be same object reference from cache
    expect(firstResult).toBe(secondResult);
  });

  it('should analyze multiple timeframes', async () => {
    const timeframes = [TimeFrame.ONE_HOUR, TimeFrame.ONE_DAY, TimeFrame.ONE_WEEK];
    const results = await analyzer.analyzeMultipleTimeframes(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      timeframes
    );

    expect(results.size).toBe(3);
    expect(results.has(TimeFrame.ONE_HOUR)).toBe(true);
    expect(results.has(TimeFrame.ONE_DAY)).toBe(true);
    expect(results.has(TimeFrame.ONE_WEEK)).toBe(true);
  });

  it('should clear cache', async () => {
    await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    expect(analyzer.getCacheSize()).toBe(1);
    analyzer.clearCache();
    expect(analyzer.getCacheSize()).toBe(0);
  });

  it('should generate support and resistance levels rationally', async () => {
    const result = await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    // Support levels should be below current price
    for (const level of result.supportLevels) {
      expect(level.price).toBeLessThan(result.currentPrice);
      expect(level.type).toBe('support');
    }

    // Resistance levels should be above current price
    for (const level of result.resistanceLevels) {
      expect(level.price).toBeGreaterThan(result.currentPrice);
      expect(level.type).toBe('resistance');
    }
  });

  it('should have valid indicators', async () => {
    const result = await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    expect(result.indicators.rsi).toBeGreaterThanOrEqual(0);
    expect(result.indicators.rsi).toBeLessThanOrEqual(100);
    expect(result.indicators.movingAverages.ma20).toBeDefined();
    expect(result.indicators.volume.ratio).toBeGreaterThan(0);
  });

  it('should have valid timestamp and expiry', async () => {
    const result = await analyzer.analyzeChart(
      { buffer: mockImageBuffer, format: 'png', width: 1024, height: 768 },
      testSymbol,
      TimeFrame.ONE_DAY
    );

    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(result.timestamp.getTime());
  });
});
