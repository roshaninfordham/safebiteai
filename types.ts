export enum InputType {
  TEXT = 'text',
  IMAGE = 'image',
  BARCODE = 'barcode',
  RECIPE = 'recipe',
  VOICE = 'voice'
}

export enum SafetyFlag {
  UNSAFE = 'Unsafe',
  CAUTION = 'Caution',
  LOW_RISK = 'Low risk'
}

export interface AgentStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
  details?: string;
}

export interface Alternative {
  name: string;
  why: string;
  taste_similarity: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface SafeBiteResponse {
  session_id: string;
  product_name: string;
  ingredient_list: string[];
  allergen_risk: string;
  safety_score: number;
  safety_flag: SafetyFlag;
  sustainability_score: number;
  sustainability_flag: string;
  explanation_short: string;
  explanation_detailed: string;
  alternatives: Alternative[];
  next_steps: string[];
  sources?: Source[];
}

export interface UserPrefs {
  user_language: string;
  diet_restriction: string;
  location: string;
}