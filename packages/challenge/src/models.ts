// packages/challenge/src/models.ts
export interface Lesson {
  day: number;
  title: string;
  content: string; // Markdown or rich text
  quiz: Quiz;
  simulatorTask?: SimulatorTask;
}

export interface Quiz {
  questions: Array<{ text: string; options: string[]; correct: number }>;
}

export interface Progress {
  userId: string;
  completedDays: number[];
  currentStreak: number;
  quizScores: Record<number, number>;
}
