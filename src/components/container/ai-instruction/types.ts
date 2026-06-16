export type AiInstructionStatus = "active" | "inactive";

export type AiInstructionRecord = {
  id: string;
  name: string;
  description: string;
  content: string;
  status: AiInstructionStatus;
  updatedAt: string;
};

export type AiInstructionFormValues = {
  name: string;
  description: string;
  content: string;
  active: boolean;
};
