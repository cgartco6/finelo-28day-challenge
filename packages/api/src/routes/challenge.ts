import { Router } from 'express';
import { ChallengeEngine } from '@finelo/challenge';

export const challengeRouter = Router();
const challengeEngine = new ChallengeEngine();

// Get today's lesson for user
challengeRouter.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const lesson = await challengeEngine.getTodaysLesson(userId);
    
    if (!lesson) {
      return res.status(404).json({ error: 'No lesson available for today' });
    }
    
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get specific lesson by day
challengeRouter.get('/lesson/:day', async (req, res) => {
  try {
    const day = parseInt(req.params.day);
    if (isNaN(day) || day < 1 || day > 28) {
      return res.status(400).json({ error: 'Invalid day. Must be between 1 and 28' });
    }
    
    const lesson = await challengeEngine.getLesson(day);
    if (!lesson) {
      return res.status(404).json({ error: `Lesson for day ${day} not found` });
    }
    
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Submit quiz answers
challengeRouter.post('/quiz', async (req, res) => {
  try {
    const { userId, day, answers } = req.body;
    
    if (!userId || !day || !answers) {
      return res.status(400).json({ error: 'Missing required fields: userId, day, answers' });
    }
    
    const result = await challengeEngine.submitQuiz(userId, day, answers);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get user progress
challengeRouter.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await challengeEngine.getUserProgress(userId);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get challenge statistics
challengeRouter.get('/stats', async (req, res) => {
  try {
    const stats = await challengeEngine.getChallengeStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Reset user progress
challengeRouter.post('/reset/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await challengeEngine.resetProgress(userId);
    res.json({ success: true, message: `Progress reset for user ${userId}` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get all lessons
challengeRouter.get('/lessons/all', async (req, res) => {
  try {
    const lessons = challengeEngine.getAllLessons();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
