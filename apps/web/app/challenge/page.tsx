'use client';

import { useState, useEffect } from 'react';
import { LessonCard } from '../../components/LessonCard';
import { Quiz } from '../../components/Quiz';
import { useChallengeStore } from '../../store/challengeStore';

export default function ChallengePage() {
  const [currentDay, setCurrentDay] = useState(1);
  const [lesson, setLesson] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const { progress, fetchProgress, submitQuiz } = useChallengeStore();
  const userId = 'demo-user-123';

  useEffect(() => {
    fetchLesson(currentDay);
    fetchProgress(userId);
  }, [currentDay]);

  const fetchLesson = async (day: number) => {
    const res = await fetch(`/api/challenge/lesson/${day}`);
    const data = await res.json();
    setLesson(data);
    setShowQuiz(false);
    setQuizResult(null);
  };

  const handleQuizSubmit = async (answers: number[]) => {
    const result = await submitQuiz(userId, currentDay, answers);
    setQuizResult(result);
    if (result.passed) {
      await fetchProgress(userId);
      setTimeout(() => {
        if (currentDay < 28) {
          setCurrentDay(currentDay + 1);
        }
      }, 2000);
    }
  };

  const isLessonCompleted = progress?.completedDays?.includes(currentDay);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Day {currentDay} of 28</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
            className="btn-secondary"
            disabled={currentDay === 1}
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentDay(Math.min(28, currentDay + 1))}
            className="btn-primary"
            disabled={currentDay === 28 || !isLessonCompleted}
          >
            Next →
          </button>
        </div>
      </div>

      {lesson && (
        <>
          <LessonCard lesson={lesson} isCompleted={isLessonCompleted} />
          
          {!isLessonCompleted && !showQuiz && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowQuiz(true)}
                className="btn-primary text-lg px-8 py-3"
              >
                Take Quiz →
              </button>
            </div>
          )}
          
          {showQuiz && !isLessonCompleted && (
            <div className="mt-6">
              <Quiz quiz={lesson.quiz} onSubmit={handleQuizSubmit} />
            </div>
          )}
          
          {quizResult && (
            <div className={`mt-6 p-4 rounded-lg text-center ${
              quizResult.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <h3 className="text-xl font-bold mb-2">
                {quizResult.passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
              </h3>
              <p>You scored {quizResult.score}%</p>
              {quizResult.passed && (
                <p className="mt-2">Great job! Moving to the next lesson...</p>
              )}
              {!quizResult.passed && (
                <button
                  onClick={() => setShowQuiz(true)}
                  className="mt-3 btn-primary"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
