
import React from 'react';
import { Point, AnalysisMode } from '../types';

interface TriangleInfo {
  points: Point[];
  perimeter: number;
}

interface GridDisplayProps {
  points: Point[];
  onGridClick: (x: number, y: number) => void;
  onPointClick: (pointId: number) => void; 
  onSecretPointRemove: () => void; 
  
  analysisMode: AnalysisMode;
  displayTriangle: TriangleInfo | null; 
  idealOrangePointId?: number;
  dejaVuSequenceActive: boolean; 
  showAreaAndPerimeter: boolean; 
  
  triggerGridAnimation: boolean; 
  triggerIdealEndgameCueAnimation: boolean; 
  isPovChanging: boolean; 

  isInteractiveForAdding: boolean; 
  canRemovePointStd: boolean; 
  isDisplayTriangleMember: (pointId: number) => boolean | undefined;
  maxPoints: number;
  minPointsRemainingAfterRemoval: number; 
  idealSurvivorEndgamePerimeter: number | null; 
  idealKillerEndgamePerimeter: number | null;
  finalAnimatingPointIds: number[] | null; 
  isFinalEscapeSequenceActive: boolean; // Added for door emoji
}

const PointComponent: React.FC<{
  pointData: Point;
  onStandardRemoveClick: () => void;
  onSecretRemoveClick?: () => void; 
  analysisMode: AnalysisMode;
  isStyledAsDisplayMember: boolean | undefined; 
  isStyledAsOrangePoint: boolean;
  applySpecialStyling: boolean; 
  isEndgameIdealAndBlue: boolean; 
  canRemoveThisPointStd: boolean;
  isSecretEndgameRemovable: boolean; 
  isAnimatingOut: boolean; 
}> = ({ 
  pointData, onStandardRemoveClick, onSecretRemoveClick,
  analysisMode, isStyledAsDisplayMember, isStyledAsOrangePoint, applySpecialStyling,
  isEndgameIdealAndBlue, canRemoveThisPointStd, isSecretEndgameRemovable, isAnimatingOut
}) => {
  
  let dynamicClasses = "bg-slate-400 border-slate-600"; 
  let animationClass = "";
  let zIndex = 10;

  if (isAnimatingOut) {
    dynamicClasses = isEndgameIdealAndBlue ? "bg-blue-500 border-blue-700" : "bg-red-500 border-red-700";
    animationClass = "animate-pointFadeOutSparkle";
    zIndex = 40; 
  } else if (applySpecialStyling && isStyledAsDisplayMember) {
    if (isStyledAsOrangePoint) {
      dynamicClasses = "bg-red-500 border-red-700"; 
      animationClass = "animate-pulseRedToOrange";
      zIndex = 30;
    } else { 
      if (isEndgameIdealAndBlue) { 
         dynamicClasses = "bg-blue-500 border-blue-700";
      } else { 
        dynamicClasses = "bg-red-500 border-red-700";
      }
      animationClass = "animate-pulseEmphasis"; 
      zIndex = 20;
    }
  } else if (applySpecialStyling && !isStyledAsDisplayMember && isStyledAsOrangePoint) {
    // This case might be redundant if orange point is always a display member, but kept for safety.
    dynamicClasses = "bg-red-500 border-red-700";
    animationClass = "animate-pulseRedToOrange";
    zIndex = 30;
  }
  
  const pointBaseClasses = "absolute w-5 h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 box-border transition-all duration-100 flex items-center justify-center";
  
  let effectiveCanRemove = false;
  let clickHandler: (() => void) | undefined = undefined;
  let cursorClass = 'cursor-default';

  if (isAnimatingOut) {
    effectiveCanRemove = false; 
    cursorClass = 'cursor-default';
  } else if (isSecretEndgameRemovable && onSecretRemoveClick) {
    effectiveCanRemove = true;
    clickHandler = onSecretRemoveClick;
    cursorClass = 'cursor-pointer'; 
  } else if (canRemoveThisPointStd) {
    effectiveCanRemove = true;
    clickHandler = onStandardRemoveClick;
    cursorClass = 'cursor-pointer';
  }


  return (
    <div
      className={`${pointBaseClasses} ${dynamicClasses} ${animationClass} ${cursorClass}`}
      style={{ left: `${pointData.x}px`, top: `${pointData.y}px`, zIndex }}
      role="button"
      aria-label={`Point at ${Math.round(pointData.x)}, ${Math.round(pointData.y)}. ${effectiveCanRemove ? 'Click to remove.' : ''}`}
      onClick={effectiveCanRemove ? clickHandler : undefined}
      tabIndex={effectiveCanRemove ? 0 : -1} 
    >
      {/* Number removed */}
    </div>
  );
};


const GridDisplay: React.FC<GridDisplayProps> = ({
  points,
  onGridClick,
  onPointClick,
  onSecretPointRemove,
  analysisMode,
  displayTriangle,
  idealOrangePointId,
  dejaVuSequenceActive,
  showAreaAndPerimeter, 
  triggerGridAnimation,
  triggerIdealEndgameCueAnimation,
  isPovChanging,
  isInteractiveForAdding, 
  canRemovePointStd,
  isDisplayTriangleMember,
  maxPoints, 
  minPointsRemainingAfterRemoval,
  idealSurvivorEndgamePerimeter,
  idealKillerEndgamePerimeter,
  finalAnimatingPointIds, 
  isFinalEscapeSequenceActive,
}) => {
  const handleNativeGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (finalAnimatingPointIds) return; 
    let target = e.target as HTMLElement;
    let isPointClick = false;
    while (target && target !== e.currentTarget) {
      if (target.getAttribute('role') === 'button' && target.classList.contains('absolute')) {
        isPointClick = true;
        break;
      }
      target = target.parentNode as HTMLElement;
    }
    if (isPointClick || !isInteractiveForAdding) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onGridClick(x, y);
  };

  const getPolygonPoints = (trianglePoints: Point[]): string => {
    return trianglePoints.map(p => `${p.x},${p.y}`).join(' ');
  };

  const getTriangleCentroid = (trianglePoints: Point[]): { x: number; y: number } | null => {
    if (trianglePoints.length !== 3) return null;
    const sumX = trianglePoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = trianglePoints.reduce((acc, p) => acc + p.y, 0);
    return { x: sumX / 3, y: sumY / 3 };
  };
  
  let currentDisplayFillColor = 'none';
  let currentDisplayStrokeColor = 'transparent';
  let currentDisplayTextFillColor = 'transparent';
  let isEndgameIdealAndBlueState = false; // This determines point color for endgame

  if (dejaVuSequenceActive && displayTriangle && displayTriangle.points.length === 3 && !finalAnimatingPointIds) {
    if (points.length === minPointsRemainingAfterRemoval) { // 3 points endgame
      let idealPerimeterForMode: number | null = null;
      if (analysisMode === 'survivor') idealPerimeterForMode = idealSurvivorEndgamePerimeter;
      else idealPerimeterForMode = idealKillerEndgamePerimeter;

      if (idealPerimeterForMode !== null && Math.abs(displayTriangle.perimeter - idealPerimeterForMode) < 0.1) {
        isEndgameIdealAndBlueState = true;
        currentDisplayStrokeColor = 'rgb(37, 99, 235)'; // Blue stroke
        if (showAreaAndPerimeter) {
          currentDisplayFillColor = 'rgba(59, 130, 246, 0.3)'; // Blue fill
          currentDisplayTextFillColor = 'rgb(37, 99, 235)'; // Blue text
        }
      } else {
        isEndgameIdealAndBlueState = false;
        currentDisplayStrokeColor = 'rgb(220, 38, 38)'; // Red stroke
        if (showAreaAndPerimeter) {
          currentDisplayFillColor = 'rgba(239, 68, 68, 0.3)'; // Red fill
          currentDisplayTextFillColor = 'rgb(185, 28, 28)'; // Red text
        }
      }
    } else if (points.length > minPointsRemainingAfterRemoval && points.length <= maxPoints) { 
        // 4 to 7 points in sequence, always red
        isEndgameIdealAndBlueState = false; 
        currentDisplayStrokeColor = 'rgb(220, 38, 38)'; 
        if (showAreaAndPerimeter) {
             currentDisplayFillColor = 'rgba(239, 68, 68, 0.3)'; 
             currentDisplayTextFillColor = 'rgb(185, 28, 28)'; 
        } else {
             currentDisplayFillColor = 'none'; 
             currentDisplayTextFillColor = 'transparent';
        }
    }
  } else if (finalAnimatingPointIds && displayTriangle?.points.some(p => finalAnimatingPointIds.includes(p.id))) {
     // Determine color based on what it was before animation (for outline during animation if needed)
     const wasIdealEndgame = (analysisMode === 'survivor' && idealSurvivorEndgamePerimeter !== null && displayTriangle && Math.abs(displayTriangle.perimeter - idealSurvivorEndgamePerimeter) < 0.1) ||
                           (analysisMode === 'killer' && idealKillerEndgamePerimeter !== null && displayTriangle && Math.abs(displayTriangle.perimeter - idealKillerEndgamePerimeter) < 0.1);
    currentDisplayStrokeColor = wasIdealEndgame ? 'rgb(37, 99, 235)' : 'rgb(220, 38, 38)';
    currentDisplayFillColor = 'none';
    currentDisplayTextFillColor = 'transparent';
  }


  let centroid: { x: number; y: number } | null = null;
  // Centroid for perimeter text, show if area/perimeter is active and triangle exists
  if (dejaVuSequenceActive && showAreaAndPerimeter && displayTriangle && displayTriangle.points.length === 3 && !finalAnimatingPointIds) {
    centroid = getTriangleCentroid(displayTriangle.points);
  }
  
  let gridAnimationClass = '';
  if (triggerGridAnimation) {
    gridAnimationClass = 'animate-gridActivePulse'; 
  } else if (triggerIdealEndgameCueAnimation) {
    gridAnimationClass = 'animate-idealEndgamePulseBlue'; 
  } else if (isPovChanging) {
    gridAnimationClass = 'animate-povChangeFlash';
  }
  
  const gridCursorStyle = (isInteractiveForAdding && !finalAnimatingPointIds) ? 'crosshair' : (finalAnimatingPointIds ? 'wait' : 'default');


  let genCountDisplay = 0;
  let genIcon = '⚡';
  if (dejaVuSequenceActive) {
    if (isFinalEscapeSequenceActive && finalAnimatingPointIds) {
      genIcon = '🚪';
      genCountDisplay = -1; // Special value to just show door
    } else if (points.length >= minPointsRemainingAfterRemoval && points.length <= maxPoints && !finalAnimatingPointIds) {
       genCountDisplay = points.length - 2;
    }
  }
  
  const applySpecialStylingToPoints = dejaVuSequenceActive && !finalAnimatingPointIds &&
                                     (points.length >= minPointsRemainingAfterRemoval );


  return (
    <div
      id="grid-container"
      className={`relative w-[500px] h-[400px] bg-slate-200 border-2 border-slate-700 mx-auto mb-5 touch-none overflow-hidden 
                 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] 
                 bg-[size:20px_20px] ${gridAnimationClass}`}
      style={{ cursor: gridCursorStyle }}
      onClick={handleNativeGridClick}
      role="application"
      aria-label={`Interactive grid. Analysis starts at ${maxPoints} points. Click to add points, or click an existing point to remove.`}
    >
      {dejaVuSequenceActive && (genCountDisplay > 0 || genIcon === '🚪') && (
        <div className="absolute top-2 left-2 bg-slate-800 text-white text-xl px-2 py-1 rounded shadow z-40">
          {genIcon} {genCountDisplay > 0 ? genCountDisplay : ''}
        </div>
      )}

      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        {dejaVuSequenceActive && displayTriangle && displayTriangle.points.length === 3 && !finalAnimatingPointIds && (
          <g>
            <polygon
              points={getPolygonPoints(displayTriangle.points)}
              fill={currentDisplayFillColor} // Updated to reflect 3-point endgame color
              stroke={currentDisplayStrokeColor}
              strokeWidth="2"
            />
            {showAreaAndPerimeter && centroid && ( // Render if showAreaAndPerimeter is true, irrespective of point count (3-7)
              <text
                x={centroid.x}
                y={centroid.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="14"
                fontWeight="bold"
                fill={currentDisplayTextFillColor} // Updated to reflect 3-point endgame color
                stroke="white" 
                strokeWidth="0.5px"
                paintOrder="stroke"
              >
                {displayTriangle.perimeter.toFixed(1)}
              </text>
            )}
          </g>
        )}
      </svg>
      {points.map(p => {
        const isThisPointAnimatingOut = finalAnimatingPointIds?.includes(p.id) ?? false;
        // isEndgameIdealAndBlueState already determined above based on current points and ideal perimeters
        const isCurrentlyIdealEndgamePointAndBlue = isEndgameIdealAndBlueState && points.length === minPointsRemainingAfterRemoval;
        const canSecretRemoveThisPoint = isCurrentlyIdealEndgamePointAndBlue && !finalAnimatingPointIds;
        
        return (
          <PointComponent
            key={p.id}
            pointData={p}
            onStandardRemoveClick={() => onPointClick(p.id)}
            onSecretRemoveClick={canSecretRemoveThisPoint ? () => onSecretPointRemove() : undefined} 
            analysisMode={analysisMode}
            isStyledAsDisplayMember={isDisplayTriangleMember(p.id)}
            isStyledAsOrangePoint={dejaVuSequenceActive && !finalAnimatingPointIds && p.id === idealOrangePointId && points.length >= (minPointsRemainingAfterRemoval + 1)}
            applySpecialStyling={applySpecialStylingToPoints || isThisPointAnimatingOut}
            isEndgameIdealAndBlue={isCurrentlyIdealEndgamePointAndBlue} 
            canRemoveThisPointStd={canRemovePointStd && !isThisPointAnimatingOut && (!finalAnimatingPointIds || !finalAnimatingPointIds.includes(p.id)) }
            isSecretEndgameRemovable={canSecretRemoveThisPoint && !isThisPointAnimatingOut}
            isAnimatingOut={isThisPointAnimatingOut}
          />
        );
      })}
    </div>
  );
};

export default GridDisplay;