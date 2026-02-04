
export interface UserProfile {
  name: string;
  age: number;
  id: string;
  email: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  mimeType: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  userId: string;
}

export interface LearningStep {
  title: string;
  content: string;
  example: string;
  practiceQuestion: string;
  hint: string;
  isCompleted?: boolean;
}

export interface LearningPath {
  id: string;
  topic: string;
  description: string;
  steps: LearningStep[];
  currentStepIndex: number;
  status: 'not_started' | 'in_progress' | 'completed';
  updatedAt: number;
}
