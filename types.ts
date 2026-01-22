
export interface RiccePrompt {
  role: string;
  instruction: string;
  context: string;
  constraints: string;
  evaluation: string;
}

export interface PromptChainStep {
  id: string;
  name: string;
  promptData: RiccePrompt;
  output?: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export interface SavedPrompt {
  id: string;
  name: string;
  description?: string;
  data: RiccePrompt;
  timestamp: number;
}

export interface VariableScenario {
  id: string;
  name: string;
  values: Record<string, string>;
}

export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  promptData: RiccePrompt;
  variables: Record<string, string>;
  outputA: string;
  outputB?: string;
  isComparison: boolean;
  scoreA?: number;
  scoreB?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface EvaluationResult {
  score: number;
  critique: string;
  suggestions: string[];
}

export interface AnalysisResult {
  feedback: string;
  improvements: Partial<RiccePrompt>;
}

export enum AppStep {
  INITIAL = 'INITIAL',
  BUILDER = 'BUILDER',
  TESTING = 'TESTING',
  IMAGE_LAB = 'IMAGE_LAB',
  CHAINER = 'CHAINER'
}
