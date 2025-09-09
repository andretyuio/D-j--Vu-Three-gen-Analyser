
import React from 'react';
import { AnalysisMode } from '../types';

interface ControlsProps {
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isProcessing: boolean; 
  pointCount: number;
  dejaVuSequenceActive: boolean;
  requiredPointsForSequence: number;
  currentMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  isPovLocked: boolean; 
  finalAnimating: boolean; 
}

const Controls: React.FC<ControlsProps> = ({
  onReset,
  onUndo,
  canUndo,
  isProcessing,
  pointCount,
  dejaVuSequenceActive,
  requiredPointsForSequence,
  currentMode,
  onModeChange,
  isPovLocked, 
  finalAnimating,
}) => {
  let statusMessage = '';

  if (finalAnimating) {
    statusMessage = 'Sequence complete! Board resetting...';
  } else if (isProcessing && pointCount > 0) {
    statusMessage = 'Processing...';
  } else if (!dejaVuSequenceActive) {
    if (pointCount < requiredPointsForSequence) {
      statusMessage = `Add ${requiredPointsForSequence - pointCount} more generator${requiredPointsForSequence - pointCount === 1 ? '' : 's'} to start analysis.`;
    } else { 
       statusMessage = `Place ${requiredPointsForSequence} generators to begin analysis.`;
    }
  } else { // Déjà-Vu Sequence is Active
    const modeLockMessage = isPovLocked ? " (Mode Locked)" : "";
    if (currentMode === 'survivor') {
        statusMessage = `Déjà-Vu Analysis${modeLockMessage}`;
    } else {
        statusMessage = `Three-gen Analysis${modeLockMessage}`;
    }
  }

  const overallDisabled = isProcessing || finalAnimating;
  const modeToggleDisabled = overallDisabled || isPovLocked;

  const handleModeToggle = () => {
    if (modeToggleDisabled) return;
    onModeChange(currentMode === 'killer' ? 'survivor' : 'killer');
  };
  
  const survivorLabelActive = currentMode === 'survivor' && !modeToggleDisabled;
  const killerLabelActive = currentMode === 'killer' && !modeToggleDisabled;
  
  let toggleBgColor = overallDisabled ? 'bg-slate-300' : 
                      (isPovLocked ? 'bg-slate-400' : 
                        (currentMode === 'survivor' ? 'bg-blue-600' : 'bg-red-600'));
  if (isPovLocked) toggleBgColor = 'bg-slate-400';

  return (
    <div className="text-center">
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
        <button
          id="undoBtn"
          onClick={onUndo}
          disabled={!canUndo || overallDisabled}
          className="px-6 py-3 text-lg font-semibold rounded-md transition-colors duration-200
                     bg-yellow-500 hover:bg-yellow-600 text-white
                     disabled:bg-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed w-full sm:w-auto"
          aria-label="Undo last action"
        >
          Undo
        </button>
        <button
          id="resetBtn"
          onClick={onReset}
          disabled={overallDisabled && pointCount > 0 && !finalAnimating} 
          className="px-6 py-3 text-lg font-semibold rounded-md transition-colors duration-200
                     bg-rose-500 hover:bg-rose-600 text-white 
                     disabled:bg-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed w-full sm:w-auto"
          aria-label="Reset all points and analysis"
        >
          Reset
        </button>
      </div>
      <div className="flex justify-center items-center my-4">
        <span className={`px-3 py-1 text-sm font-medium ${modeToggleDisabled ? 'text-slate-400' : (survivorLabelActive ? 'text-blue-700 font-bold' : 'text-slate-700')}`}>
          Survivor Mode
        </span>
        <button
          onClick={handleModeToggle}
          disabled={modeToggleDisabled}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${(modeToggleDisabled || overallDisabled) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${toggleBgColor}`}
          role="switch"
          aria-checked={currentMode === 'killer'} 
          aria-label={`Switch to ${currentMode === 'survivor' ? 'Killer' : 'Survivor'} Mode. ${isPovLocked ? 'Mode is locked for this sequence.' : ''}`}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${currentMode === 'killer' ? 'translate-x-6' : 'translate-x-1'}`} 
          />
        </button>
        <span className={`px-3 py-1 text-sm font-medium ${modeToggleDisabled ? 'text-slate-400' : (killerLabelActive ? 'text-red-700 font-bold' : 'text-slate-700')}`}>
          Killer Mode
        </span>
      </div>
      {statusMessage && (
        <p className="text-slate-600 mt-3 text-sm h-10 flex items-center justify-center" aria-live="polite" dangerouslySetInnerHTML={{ __html: statusMessage }}></p>
      )}
    </div>
  );
};

export default Controls;