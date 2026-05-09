'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LessonCard } from '../components/LessonCard';
import { SimulatorWidget } from '../components/SimulatorWidget';
import { useChallengeStore } from '../store/challengeStore';

export default function Home() {
  const [todayLesson, setTodayLesson] = useState(null);
  const [stats, setStats] = useState(null);
  const { progress, fetchProgress } = useChallengeStore();
  const userId = 'demo-user-123';

  useEffect(() => {
    fetchTodayLesson();
    fetchProgress(userId);
    fetchStats();
  }, []);

  const fetchTodayLesson = async () => {
    const res = await fetch(`/api/challenge/today/${userId}`);
    const data = await res.json();
    setTodayLesson(data);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/challenge/stats');
    const data = await res.json();
    setStats(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-8 mb-8">
        <h1 className="text-4xl font-bold mb-2">28-Day Trading Challenge</h1>
        <p className="text-xl opacity-90">Master trading step by step with daily lessons, quizzes, and a risk-free simulator</p>
        <div className="mt-4 flex gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{progress?.completedDays?.length || 0}/28</div>
            <div className="text-sm">Days Completed</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{progress?.streak || 0}</div>
            <div className="text-sm">Day Streak</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <div className="text-sm">Active Learners</div>
          </div>
        </div>
      </div>

      {/* Today's Lesson */}
      {todayLesson && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Today's Lesson</h2>
          <LessonCard lesson={todayLesson} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link href="/challenge" className="card hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">📚 Continue Challenge</h3>
          <p className="text-gray-600">Resume your learning journey</p>
        </Link>
        <Link href="/simulator" className="card hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">💰 Practice Trading</h3>
          <p className="text-gray-600">Test strategies with virtual money</p>
        </Link>
        <Link href="/approvals" className="card hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">✅ Pending Approvals</h3>
          <p className="text-gray-600">Review auto-trade requests</p>
        </Link>
      </div>

      {/* Simulator Preview */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Quick Trade Preview</h2>
        <SimulatorWidget userId={userId} />
      </div>

      {/* Progress Overview */}
      {progress && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Your Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${((progress.completedDays?.length || 0) / 28) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
              <div
                key={day}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold
                  ${progress.completedDays?.includes(day) 
                    ? 'bg-green-500 text-white' 
                    : day === (progress.currentDay || 1)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'}`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
