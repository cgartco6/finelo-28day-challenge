import { describe, it, expect, vi } from "vitest";
import { ChallengeEngine } from "../src/ChallengeEngine.js";

describe("ChallengeEngine", () => {
  it("returns null when all 28 days are completed", async () => {
    const engine = new ChallengeEngine();
    const progress = { userId: "u1", completedDays: Array.from({ length: 28 }, (_, i) => i + 1), currentStreak: 28, quizScores: {} };
    vi.spyOn(engine as any, "loadProgress").mockResolvedValue(progress);
    const lesson = await engine.getTodaysLesson("u1");
    expect(lesson).toBeNull();
  });
});
