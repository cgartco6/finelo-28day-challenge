import { describe, it, expect, beforeEach } from 'vitest';
import { ChallengeEngine } from '../src/ChallengeEngine.js';

describe('ChallengeEngine', () => {
  let engine: ChallengeEngine;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    engine = new ChallengeEngine();
  });

  it('should get lesson by day', async () => {
    const lesson = await engine.getLesson(1);
    expect(lesson).toBeDefined();
    expect(lesson?.day).toBe(1);
    expect(lesson?.title).toContain('Introduction');
  });

  it('should return null for invalid day', async () => {
    const lesson = await engine.getLesson(99);
    expect(lesson).toBeNull();
  });

  it('should get today\'s lesson for new user', async () => {
    const lesson = await engine.getTodaysLesson(testUserId);
    expect(lesson).toBeDefined();
    expect(lesson?.day).toBe(1);
  });

  it('should submit quiz and track progress', async () => {
    const lesson = await engine.getLesson(1);
    const answers = lesson!.quiz.questions.map(q => q.correctAnswer);
    
    const result = await engine.submitQuiz(testUserId, 1, answers);
    
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    
    const progress = await engine.getUserProgress(testUserId);
    expect(progress.completedDays).toContain(1);
    expect(progress.currentDay).toBe(2);
  });

  it('should not pass quiz with low score', async () => {
    const result = await engine.submitQuiz(testUserId, 1, [0, 0]);
    
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(60);
    
    const progress = await engine.getUserProgress(testUserId);
    expect(progress.completedDays).not.toContain(1);
  });

  it('should calculate streak correctly', async () => {
    // Complete day 1
    const lesson1 = await engine.getLesson(1);
    await engine.submitQuiz(testUserId, 1, lesson1!.quiz.questions.map(q => q.correctAnswer));
    
    // Complete day 2
    const lesson2 = await engine.getLesson(2);
    await engine.submitQuiz(testUserId, 2, lesson2!.quiz.questions.map(q => q.correctAnswer));
    
    const progress = await engine.getUserProgress(testUserId);
    expect(progress.streak).toBe(2);
  });

  it('should reset user progress', async () => {
    await engine.submitQuiz(testUserId, 1, [1, 1]);
    await engine.resetProgress(testUserId);
    
    const progress = await engine.getUserProgress(testUserId);
    expect(progress.completedDays).toHaveLength(0);
    expect(progress.currentDay).toBe(1);
  });

  it('should return challenge statistics', async () => {
    const stats = await engine.getChallengeStats();
    expect(stats).toHaveProperty('totalUsers');
    expect(stats).toHaveProperty('averageCompletion');
    expect(stats).toHaveProperty('mostFailedDay');
  });
});
