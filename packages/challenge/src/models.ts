export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  passingScore: number;
}

export interface SimulatorTask {
  type: 'buy' | 'sell' | 'analyze';
  asset: string;
  targetPrice?: number;
  quantity?: number;
}

export interface Lesson {
  day: number;
  title: string;
  description: string;
  content: string;
  learningObjectives: string[];
  quiz: Quiz;
  simulatorTask?: SimulatorTask;
  resources: string[];
}

export interface UserProgress {
  userId: string;
  completedDays: number[];
  currentDay: number;
  quizScores: Map<number, number>;
  startedAt: Date;
  lastActiveAt: Date;
  streak: number;
}

export interface ChallengeStats {
  totalUsers: number;
  averageCompletion: number;
  mostFailedDay: number;
  popularLessons: number[];
}
