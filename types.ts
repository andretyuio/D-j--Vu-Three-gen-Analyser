
export interface Point {
  id: number;
  x: number;
  y: number;
}

export type AnalysisMode = 'killer' | 'survivor';

// AnalysisOutput is simplified as the detailed text panel was removed.
// The core output is now visual and managed by specific state variables.
export interface AnalysisOutput {
  title: string;
  message: string;
}

export interface HistoryEntry {
  points: Point[];
  nextPointId: number;
  dejaVuSequenceActive: boolean;
  idealSurvivorEndgamePerimeter: number | null;
  idealKillerEndgamePerimeter: number | null;
  initialSevenPointsSnapshot: Point[] | null;
  isPovLocked: boolean; // Added to track POV lock state
}
