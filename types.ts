export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-based index
  explanation: string; // Brief explanation of why the answer is correct
}

export interface AnalysisResult {
  title: string;
  explanation: string;
  relationshipDescription: string; // Detailed description of a specific relationship/flow
  quiz: QuizQuestion[];
}

export interface ProcessingState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  error?: string;
}