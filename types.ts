
export type Difficulty = 'Junior' | 'Mid' | 'Senior';
export type Persona = 'Friendly' | 'Direct' | 'Technical';

export interface InterviewSetup {
  jobTitle: string;
  jobDescription: string;
  yearsOfExperience: number;
  techStack: string;
  questionCount: number;
  difficulty: Difficulty;
  persona: Persona;
}

export interface InterviewQuestion {
  id: string;
  text: string;
}

export interface InterviewSession {
  id: string;
  setup: InterviewSetup;
  questions: InterviewQuestion[];
  transcript: string[];
  status: 'ready' | 'completed';
  feedback?: InterviewFeedback;
  date: string;
  parentSessionId?: string; // If this is a retake, point to the original
}

export interface InterviewFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  contentFeedback: string;
  speechFeedback: string;
  improvementTips: string[];
  speechMetrics?: {
    fillerWordCount: number;
    paceDescription: string;
    clarityScore: number;
  };
}

export interface Message {
  role: 'user' | 'interviewer';
  text: string;
}
