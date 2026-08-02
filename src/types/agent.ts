export interface AgentToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  executionTimeMs: number;
  hitlRequired?: boolean;
}

export interface HITLRequestPayload<T = unknown> {
  toolName: string;
  parameters: T;
  actionSummary: string;
  confirmationId: string;
}

export interface ToolExecutionRecord {
  toolName: string;
  executionTimeMs: number;
  success: boolean;
}

export interface AgentStepState {
  currentStep: number;
  maxSteps: number;
  executionHistory: ToolExecutionRecord[];
  circuitBreakerTripped: boolean;
  abortReason?: string;
}
