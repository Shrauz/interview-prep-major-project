import { InterviewSetup, InterviewSession } from '../types';

const BASE_URL = 'http://127.0.0.1:5000';

// Helper to get headers with the JWT token
const getAuthHeaders = () => {
  const token = localStorage.getItem('hireprep_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.trim()}` // Must include "Bearer " prefix
  };
};

export const generateQuestions = async (setup: InterviewSetup): Promise<string[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/generate-questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(setup),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'AI_GENERATION_FAILED');
    }

    return data.questions || [];
  } catch (error) {
    console.error("Question Generation Error:", error);
    return [];
  }
};

export const analyzeInterview = async (session: InterviewSession): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/api/analyze-session`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(session),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
    }

    return await response.json();
  } catch (e) {
    console.error("Gemini Analysis Error:", e);
    return null;
  }
};

export const getNextInterviewerResponse = async (history: any[], setup: any) => {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ history, setup }),
  });

  if (!response.ok) throw new Error('Failed to get AI response');
  
  const data = await response.json();
  return data.text;
};