import { Lesson, UserProgress, Quiz, ChallengeStats } from './models.js';

export class ChallengeEngine {
  private lessons: Map<number, Lesson> = new Map();
  private userProgress: Map<string, UserProgress> = new Map();

  constructor() {
    this.initializeLessons();
  }

  private initializeLessons(): void {
    // Day 1: Introduction to Trading
    this.lessons.set(1, {
      day: 1,
      title: 'Introduction to Financial Markets',
      description: 'Learn the basics of stocks, forex, and crypto markets',
      content: 'Financial markets are where buyers and sellers trade assets...',
      learningObjectives: [
        'Understand what financial markets are',
        'Identify different asset classes',
        'Learn basic market terminology'
      ],
      quiz: {
        id: 'quiz_day1',
        title: 'Market Basics Quiz',
        questions: [
          {
            id: 'q1',
            text: 'What is a stock?',
            options: ['A loan to a company', 'Ownership in a company', 'A type of bond', 'A commodity'],
            correctAnswer: 1,
            explanation: 'A stock represents ownership shares in a company'
          },
          {
            id: 'q2',
            text: 'Which market trades currencies?',
            options: ['Stock Market', 'Commodity Market', 'Forex Market', 'Bond Market'],
            correctAnswer: 2,
            explanation: 'The Forex (Foreign Exchange) market trades currencies'
          }
        ],
        passingScore: 60
      },
      resources: ['https://finelo.com/guides/market-basics']
    });

    // Day 2: Technical Analysis
    this.lessons.set(2, {
      day: 2,
      title: 'Introduction to Technical Analysis',
      description: 'Learn to read price charts and identify trends',
      content: 'Technical analysis involves studying historical price data...',
      learningObjectives: [
        'Understand different chart types',
        'Identify support and resistance levels',
        'Recognize basic chart patterns'
      ],
      quiz: {
        id: 'quiz_day2',
        title: 'Technical Analysis Basics',
        questions: [
          {
            id: 'q1',
            text: 'What does a candlestick show?',
            options: ['Only closing price', 'Open, high, low, close', 'Only volume', 'Only trend direction'],
            correctAnswer: 1,
            explanation: 'A candlestick shows the open, high, low, and close prices for a period'
          }
        ],
        passingScore: 60
      },
      simulatorTask: {
        type: 'analyze',
        asset: 'BTC/USD',
        targetPrice: 50000
      },
      resources: ['https://finelo.com/guides/technical-analysis']
    });

    // Days 3-28 would be similarly defined
    for (let i = 3; i <= 28; i++) {
      this.lessons.set(i, {
        day: i,
        title: `Day ${i}: Advanced Trading Concepts`,
        description: `Continue your trading education with day ${i}`,
        content: `This is lesson content for day ${i}...`,
        learningObjectives: [`Objective ${i}`, `Another objective for day ${i}`],
        quiz: {
          id: `quiz_day${i}`,
          title: `Day ${i} Quiz`,
          questions: [
            {
              id: `q_day${i}_1`,
              text: `Sample question for day ${i}`,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: 0,
              explanation: `Explanation for day ${i} question`
            }
          ],
          passingScore: 60
        },
        resources: [`https://finelo.com/day${i}`]
      });
    }
  }

  async getLesson(day: number): Promise<Lesson | null> {
    return this.lessons.get(day) || null;
  }

  async getTodaysLesson(userId: string): Promise<Lesson | null> {
    const progress = await this.getUserProgress(userId);
    const nextDay = progress.currentDay;
    
    if (nextDay > 28) {
      return null;
    }
    
    return this.getLesson(nextDay);
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        userId,
        completedDays: [],
        currentDay: 1,
        quizScores: new Map(),
        startedAt: new Date(),
        lastActiveAt: new Date(),
        streak: 0
      });
    }
    return this.userProgress.get(userId)!;
  }

  async submitQuiz(userId: string, day: number, answers: number[]): Promise<{ passed: boolean; score: number }> {
    const lesson = await this.getLesson(day);
    if (!lesson) {
      throw new Error(`Lesson for day ${day} not found`);
    }

    let correctCount = 0;
    for (let i = 0; i < lesson.quiz.questions.length; i++) {
      if (answers[i] === lesson.quiz.questions[i].correctAnswer) {
        correctCount++;
      }
    }

    const score = (correctCount / lesson.quiz.questions.length) * 100;
    const passed = score >= lesson.quiz.passingScore;

    if (passed) {
      const progress = await this.getUserProgress(userId);
      if (!progress.completedDays.includes(day)) {
        progress.completedDays.push(day);
        progress.currentDay = day + 1;
        progress.quizScores.set(day, score);
        progress.lastActiveAt = new Date();
        progress.streak = this.calculateStreak(progress);
        this.userProgress.set(userId, progress);
      }
    }

    return { passed, score };
  }

  private calculateStreak(progress: UserProgress): number {
    // Simplified streak calculation
    let streak = 0;
    for (let i = progress.currentDay - 1; i >= 1; i--) {
      if (progress.completedDays.includes(i)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  async getChallengeStats(): Promise<ChallengeStats> {
    const totalUsers = this.userProgress.size;
    let totalCompletion = 0;
    const dayFailures = new Map<number, number>();

    for (const progress of this.userProgress.values()) {
      totalCompletion += progress.completedDays.length / 28;
      
      // Track which days are most frequently missed
      for (let day = 1; day <= 28; day++) {
        if (!progress.completedDays.includes(day)) {
          dayFailures.set(day, (dayFailures.get(day) || 0) + 1);
        }
      }
    }

    let mostFailedDay = 1;
    let maxFailures = 0;
    for (const [day, failures] of dayFailures) {
      if (failures > maxFailures) {
        maxFailures = failures;
        mostFailedDay = day;
      }
    }

    return {
      totalUsers,
      averageCompletion: totalUsers > 0 ? totalCompletion / totalUsers : 0,
      mostFailedDay,
      popularLessons: [1, 2, 3] // Simplified
    };
  }

  async resetProgress(userId: string): Promise<void> {
    this.userProgress.delete(userId);
  }

  getAllLessons(): Lesson[] {
    return Array.from(this.lessons.values()).sort((a, b) => a.day - b.day);
  }
}
