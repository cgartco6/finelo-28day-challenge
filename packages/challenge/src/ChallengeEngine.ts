// packages/challenge/src/ChallengeEngine.ts
export class ChallengeEngine {
  async getTodaysLesson(userId: string): Promise<Lesson | null> {
    const progress = await this.loadProgress(userId);
    const nextDay = progress.completedDays.length + 1;
    if (nextDay > 28) return null;
    return this.lessonRepo.getByDay(nextDay);
  }

  async submitQuiz(userId: string, day: number, answers: number[]): Promise<boolean> {
    const lesson = await this.lessonRepo.getByDay(day);
    if (!lesson) return false;

    const score = answers.reduce((sum, ans, idx) => {
      return sum + (ans === lesson.quiz.questions[idx].correct ? 1 : 0);
    }, 0);
    const passed = score / lesson.quiz.questions.length >= 0.6;

    if (passed) {
      await this.progressRepo.recordCompletion(userId, day);
    }
    return passed;
  }
}
