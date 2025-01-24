export interface GameState {
  mode: "manual" | "auto";
  betAmount: number;
  risk: "low" | "medium" | "high";
  rows: number;
  isRunning: boolean;
  balance: number;
  sound: boolean;
}

// برای خروجی ضرایب
export interface Multiplier {
  value: number;
  color: string;
}

export type RiskLevel = "low" | "medium" | "high";
