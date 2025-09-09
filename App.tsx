
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Point, AnalysisMode, HistoryEntry } from './types';
import GridDisplay from './components/GridDisplay';
import Controls from './components/Controls';
import { getCombinations, getPerimeter, distance as calculateDistance } from './utils/geometry';

const MAX_POINTS = 7; 
const MIN_POINTS_REMAINING_AFTER_REMOVAL = 3;
const REQUIRED_POINTS_FOR_DEJAVU_SEQUENCE = 7;

const MIN_DISTANCE_FROM_OTHER_POINTS = 20;
const GRID_PADDING = 10;
const SECRET_REMOVAL_ANIMATION_DURATION = 1000; // ms
const GRID_PULSE_ANIMATION_DURATION = 1000; // ms
const POV_CHANGE_ANIMATION_DURATION = 600; // ms, matches new animation duration


interface TriangleInfo {
  points: Point[];
  perimeter: number;
}

const findOptimalTriangle = (
  availablePoints: Point[],
  goal: 'findTightest' | 'findLoosest'
): TriangleInfo | null => {
  if (availablePoints.length < 3) return null;
  const allC3 = getCombinations(availablePoints, 3) as [Point, Point, Point][];
  if (allC3.length === 0) return null;

  let bestTrianglePoints: Point[] | null = null;
  let bestPerimeter = goal === 'findTightest' ? Infinity : -Infinity;

  for (const triangle of allC3) {
    const p = getPerimeter(triangle);
    if (goal === 'findTightest') {
      if (p < bestPerimeter) {
        bestPerimeter = p;
        bestTrianglePoints = triangle;
      }
    } else { // findLoosest
      if (p > bestPerimeter) {
        bestPerimeter = p;
        bestTrianglePoints = triangle;
      }
    }
  }
  return bestTrianglePoints ? { points: bestTrianglePoints, perimeter: bestPerimeter } : null;
};

const findIdealPointToRemoveForDejaVu = (
  primaryTrianglePoints: Point[], 
  allCurrentPoints: Point[], 
  mode: AnalysisMode
): number | undefined => {
  if (primaryTrianglePoints.length !== 3 || allCurrentPoints.length < (MIN_POINTS_REMAINING_AFTER_REMOVAL + 1) ) { 
    return undefined;
  }

  let bestSecondaryOutcomePerimeter = mode === 'survivor' ? -Infinity : Infinity; 
  let idealPointIdToRemove: number | undefined = undefined;

  for (const pointToRemoveFromPrimary of primaryTrianglePoints) {
    const remainingPointsAfterRemoval = allCurrentPoints.filter(p => p.id !== pointToRemoveFromPrimary.id);
    if (remainingPointsAfterRemoval.length < 3) continue; 

    const nextTriangleGoal = mode === 'survivor' ? 'findLoosest' : 'findTightest';
    const secondaryOptimalTriangle = findOptimalTriangle(remainingPointsAfterRemoval, nextTriangleGoal);

    if (secondaryOptimalTriangle) {
      if (mode === 'survivor') {
        if (secondaryOptimalTriangle.perimeter > bestSecondaryOutcomePerimeter) {
          bestSecondaryOutcomePerimeter = secondaryOptimalTriangle.perimeter;
          idealPointIdToRemove = pointToRemoveFromPrimary.id;
        }
      } else { // killer
        if (secondaryOptimalTriangle.perimeter < bestSecondaryOutcomePerimeter) {
          bestSecondaryOutcomePerimeter = secondaryOptimalTriangle.perimeter;
          idealPointIdToRemove = pointToRemoveFromPrimary.id;
        }
      }
    }
  }
  return idealPointIdToRemove;
};


const App: React.FC = () => {
  const [points, setPoints] = useState<Point[]>([]);
  const [nextPointId, setNextPointId] = useState(1);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('survivor');
  
  const [currentDisplayTriangle, setCurrentDisplayTriangle] = useState<TriangleInfo | null>(null);
  const [dejaVuIdealOrangePointId, setDejaVuIdealOrangePointId] = useState<number | undefined>(undefined);
  
  const [dejaVuSequenceActive, setDejaVuSequenceActive] = useState<boolean>(false);
  const [showAreaAndPerimeter, setShowAreaAndPerimeter] = useState<boolean>(false); 
  const [finalAnimatingPointIds, setFinalAnimatingPointIds] = useState<number[] | null>(null); 
  const [isFinalEscapeSequenceActive, setIsFinalEscapeSequenceActive] = useState<boolean>(false); // For door emoji

  const [triggerGridAnimation, setTriggerGridAnimation] = useState<boolean>(false); 
  const [triggerIdealEndgameCueAnimation, setTriggerIdealEndgameCueAnimation] = useState<boolean>(false); 
  const [isPovChanging, setIsPovChanging] = useState<boolean>(false);


  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isPovLocked, setIsPovLocked] = useState<boolean>(false);


  const [idealSurvivorEndgamePerimeter, setIdealSurvivorEndgamePerimeter] = useState<number | null>(null);
  const [idealKillerEndgamePerimeter, setIdealKillerEndgamePerimeter] = useState<number | null>(null);
  const [initialSevenPointsSnapshot, setInitialSevenPointsSnapshot] = useState<Point[] | null>(null);

  const analysisDebounceTimer = useRef<number | null>(null);

  const performFullBoardReset = useCallback(() => {
    setPoints([]);
    setNextPointId(1);
    setHistory([]);
    setCurrentDisplayTriangle(null);
    setDejaVuIdealOrangePointId(undefined);
    setShowAreaAndPerimeter(false);
    setDejaVuSequenceActive(false);
    setIdealSurvivorEndgamePerimeter(null);
    setIdealKillerEndgamePerimeter(null);
    setInitialSevenPointsSnapshot(null);
    setFinalAnimatingPointIds(null);
    setIsFinalEscapeSequenceActive(false); // Reset door emoji state
    setTriggerGridAnimation(false);
    setTriggerIdealEndgameCueAnimation(false);
    setIsPovLocked(false);
    setIsProcessing(false);
    setIsPovChanging(false);
  }, []);

  const resetAnalysisState = useCallback((fullReset = false) => {
    setCurrentDisplayTriangle(null);
    setDejaVuIdealOrangePointId(undefined);
    setShowAreaAndPerimeter(false); 
    if (fullReset) { 
      setDejaVuSequenceActive(false);
      setIdealSurvivorEndgamePerimeter(null);
      setIdealKillerEndgamePerimeter(null);
      setInitialSevenPointsSnapshot(null);
      setFinalAnimatingPointIds(null); 
      setIsFinalEscapeSequenceActive(false);
      setTriggerGridAnimation(false);
      setTriggerIdealEndgameCueAnimation(false);
      setIsPovLocked(false);
    }
  }, []);

  const runFullAnalysisLogic = useCallback((currentPoints: Point[], mode: AnalysisMode, sequenceActive: boolean) => {
    if (finalAnimatingPointIds) {
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    setCurrentDisplayTriangle(null); 
    setDejaVuIdealOrangePointId(undefined);
    setShowAreaAndPerimeter(false);
    setTriggerIdealEndgameCueAnimation(false);

    if (!sequenceActive || currentPoints.length < MIN_POINTS_REMAINING_AFTER_REMOVAL) {
      if (currentPoints.length < MIN_POINTS_REMAINING_AFTER_REMOVAL && sequenceActive) {
          setDejaVuSequenceActive(false); 
          setIsPovLocked(false); 
      }
      setIsProcessing(false);
      return;
    }
    
    let primaryTriangle: TriangleInfo | null = null;

    if (currentPoints.length >= MIN_POINTS_REMAINING_AFTER_REMOVAL) {
        if (currentPoints.length === MIN_POINTS_REMAINING_AFTER_REMOVAL) { 
            if (getCombinations(currentPoints, 3).length > 0) {
                primaryTriangle = { points: [...currentPoints], perimeter: getPerimeter(currentPoints as [Point,Point,Point])};
                const idealPerimeterForMode = mode === 'survivor' ? idealSurvivorEndgamePerimeter : idealKillerEndgamePerimeter;
                if (idealPerimeterForMode !== null && primaryTriangle && Math.abs(primaryTriangle.perimeter - idealPerimeterForMode) < 0.1) {
                    setTriggerIdealEndgameCueAnimation(true);
                    setTimeout(() => setTriggerIdealEndgameCueAnimation(false), GRID_PULSE_ANIMATION_DURATION);
                }
            }
        } else { // 4 to 7 points in sequence
            const goalForPrimary = mode === 'survivor' ? 'findTightest' : (mode === 'killer' ? 'findLoosest' : 'findTightest'); 
            primaryTriangle = findOptimalTriangle(currentPoints, goalForPrimary);
        }
    }
    
    setCurrentDisplayTriangle(primaryTriangle);

    if (primaryTriangle) {
      if (currentPoints.length >= (MIN_POINTS_REMAINING_AFTER_REMOVAL + 1)) { 
        const orangeId = findIdealPointToRemoveForDejaVu(primaryTriangle.points, currentPoints, mode);
        setDejaVuIdealOrangePointId(orangeId);
      }
      // Show area/perimeter for 3 to 7 points in sequence
      if (currentPoints.length >= MIN_POINTS_REMAINING_AFTER_REMOVAL && currentPoints.length <= REQUIRED_POINTS_FOR_DEJAVU_SEQUENCE) {
        setShowAreaAndPerimeter(true); 
      }
    }
    
    setIsProcessing(false);
  }, [finalAnimatingPointIds, idealSurvivorEndgamePerimeter, idealKillerEndgamePerimeter]);


  useEffect(() => {
    if (finalAnimatingPointIds) return; 

    if (analysisDebounceTimer.current) {
      clearTimeout(analysisDebounceTimer.current);
    }
    
    if (dejaVuSequenceActive) {
        analysisDebounceTimer.current = window.setTimeout(() => {
            runFullAnalysisLogic(points, analysisMode, dejaVuSequenceActive);
        }, 150);
    } else {
        resetAnalysisState(false); 
    }

    return () => {
        if (analysisDebounceTimer.current) {
            clearTimeout(analysisDebounceTimer.current);
        }
    };
  }, [points, analysisMode, dejaVuSequenceActive, runFullAnalysisLogic, resetAnalysisState, finalAnimatingPointIds]);

  const addHistoryEntry = useCallback(() => {
     setHistory(prev => [...prev, { 
         points, 
         nextPointId, 
         dejaVuSequenceActive, 
         idealSurvivorEndgamePerimeter, 
         idealKillerEndgamePerimeter,
         initialSevenPointsSnapshot,
         isPovLocked 
        }]);
  }, [points, nextPointId, dejaVuSequenceActive, idealSurvivorEndgamePerimeter, idealKillerEndgamePerimeter, initialSevenPointsSnapshot, isPovLocked]);

  const handleGridClick = useCallback((x: number, y: number) => {
    if (finalAnimatingPointIds || isProcessing || (dejaVuSequenceActive && points.length >= REQUIRED_POINTS_FOR_DEJAVU_SEQUENCE) || points.length >= MAX_POINTS) {
      return;
    }
        
    const gridWidth = 500; 
    const gridHeight = 400;

    if (x < GRID_PADDING || x > gridWidth - GRID_PADDING || y < GRID_PADDING || y > gridHeight - GRID_PADDING) return;
    for (const point of points) {
        if (calculateDistance({id:0,x,y}, point) < MIN_DISTANCE_FROM_OTHER_POINTS) return;
    }

    addHistoryEntry();
    const newPoint = { id: nextPointId, x, y };
    const newPointsArray = [...points, newPoint];
    setPoints(newPointsArray);
    setNextPointId(prevId => prevId + 1);

    if (newPointsArray.length === REQUIRED_POINTS_FOR_DEJAVU_SEQUENCE && !dejaVuSequenceActive) {
        setDejaVuSequenceActive(true);
        setTriggerGridAnimation(true);
        setTimeout(() => setTriggerGridAnimation(false), GRID_PULSE_ANIMATION_DURATION); 
        
        const idealSurvivorTriangle = findOptimalTriangle(newPointsArray, 'findLoosest');
        if (idealSurvivorTriangle) setIdealSurvivorEndgamePerimeter(idealSurvivorTriangle.perimeter);
        
        const idealKillerTriangle = findOptimalTriangle(newPointsArray, 'findTightest');
        if (idealKillerTriangle) setIdealKillerEndgamePerimeter(idealKillerTriangle.perimeter);
        
        setInitialSevenPointsSnapshot([...newPointsArray]);
        setIsPovLocked(false); 
    }
  }, [points, nextPointId, isProcessing, addHistoryEntry, dejaVuSequenceActive, finalAnimatingPointIds]);


  const handlePointClickForRemoval = useCallback((pointIdToRemove: number) => {
    if (finalAnimatingPointIds || isProcessing) return;
    if (!dejaVuSequenceActive || points.length <= MIN_POINTS_REMAINING_AFTER_REMOVAL ) return;
    
    addHistoryEntry();
    const newPoints = points.filter(p => p.id !== pointIdToRemove);
    setPoints(newPoints);

    if (dejaVuSequenceActive && !isPovLocked && newPoints.length >= MIN_POINTS_REMAINING_AFTER_REMOVAL && newPoints.length < REQUIRED_POINTS_FOR_DEJAVU_SEQUENCE) {
      setIsPovLocked(true);
    }
  }, [points, isProcessing, addHistoryEntry, dejaVuSequenceActive, finalAnimatingPointIds, isPovLocked]);

  const handleSecretEndgameRemoval = useCallback(() => { 
    if (finalAnimatingPointIds || isProcessing) return; 
    if (!dejaVuSequenceActive || points.length !== MIN_POINTS_REMAINING_AFTER_REMOVAL || !currentDisplayTriangle) return;

    let isIdeal = false;
    const idealPerimeterForMode = analysisMode === 'survivor' ? idealSurvivorEndgamePerimeter : idealKillerEndgamePerimeter;
    if (idealPerimeterForMode !== null && Math.abs(currentDisplayTriangle.perimeter - idealPerimeterForMode) < 0.1) {
        isIdeal = true;
    }
    
    if (!isIdeal) return; 

    addHistoryEntry(); 
    const idsToAnimate = currentDisplayTriangle.points.map(p => p.id);
    setFinalAnimatingPointIds(idsToAnimate);
    setIsFinalEscapeSequenceActive(true); // Activate door emoji
    setTriggerIdealEndgameCueAnimation(false); 

    setTimeout(() => {
      performFullBoardReset(); 
    }, SECRET_REMOVAL_ANIMATION_DURATION);

  }, [currentDisplayTriangle, points, isProcessing, addHistoryEntry, dejaVuSequenceActive, performFullBoardReset, finalAnimatingPointIds, analysisMode, idealSurvivorEndgamePerimeter, idealKillerEndgamePerimeter]);
  

  const handleUndoLastAction = useCallback(() => {
    if (finalAnimatingPointIds || history.length === 0 || isProcessing) return;
    
    const previousState = history[history.length - 1];
    setPoints(previousState.points);
    setNextPointId(previousState.nextPointId);
    setDejaVuSequenceActive(previousState.dejaVuSequenceActive);
    setIdealSurvivorEndgamePerimeter(previousState.idealSurvivorEndgamePerimeter);
    setIdealKillerEndgamePerimeter(previousState.idealKillerEndgamePerimeter);
    setInitialSevenPointsSnapshot(previousState.initialSevenPointsSnapshot);
    setIsPovLocked(previousState.isPovLocked); 
    
    setTriggerGridAnimation(false);
    setTriggerIdealEndgameCueAnimation(false);
    setShowAreaAndPerimeter(false); 
    setFinalAnimatingPointIds(null); 
    setIsFinalEscapeSequenceActive(false);
    setHistory(prev => prev.slice(0, -1));
  }, [history, isProcessing, finalAnimatingPointIds]);

  const handleReset = useCallback(() => {
    if (finalAnimatingPointIds) return; 
    performFullBoardReset();
  }, [performFullBoardReset, finalAnimatingPointIds]);
  
  const handleModeChange = (newMode: AnalysisMode) => {
    if (finalAnimatingPointIds || isProcessing || isPovLocked) return; 
    setAnalysisMode(newMode);
    setIsPovChanging(true);
    setTimeout(() => setIsPovChanging(false), POV_CHANGE_ANIMATION_DURATION);
  };
  
  const isDisplayTriangleMember = (pointId: number) =>
    dejaVuSequenceActive && !finalAnimatingPointIds && currentDisplayTriangle?.points.some(p => p.id === pointId);

  const canAddPointsToGrid = !dejaVuSequenceActive && points.length < MAX_POINTS && !finalAnimatingPointIds && !isProcessing;

  return (
    <div className="font-sans max-w-3xl mx-auto p-4 sm:p-6 bg-slate-100 rounded-lg shadow-xl my-5">
      <header className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Déjà-Vu / Three-gen Analyser</h1>
        <p className="text-slate-600 mt-3 text-sm sm:text-base">
          Analyze 3-gen clusters and optimal break points.
        </p>
      </header>
      
      <main>
        <div className="bg-slate-200 p-4 rounded-md text-slate-700 mb-6 text-sm sm:text-base">
          <ol className="list-decimal list-inside space-y-2">
            <li>Click grid to add up to 7 generators.</li>
            <li>7 generators placed: Analysis begins (grid flashes <span className="text-red-600 font-semibold">RED</span>). No new points can be added.</li>
            <li>Active Sequence (3-7 generators): The analysis shows the relevant <span className="text-red-600 font-semibold">RED</span> 3-gen. The <span className="text-orange-500 font-semibold">Orange point</span> guides to the optimal final 3-gen. Area/Perimeter shown.
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>Survivor (Déjà-Vu Mode):</strong> Initially targets the tightest 3-gen.</li>
                <li><strong>Killer (Three-gen Mode):</strong> Initially targets the loosest 3-gen.</li>
              </ul>
            </li>
            <li>Click a generator to remove it from the map.</li>
          </ol>
          <p className="text-xs text-slate-500 pt-3 italic w-full text-center">For leveled maps only.</p>
        </div>

        <GridDisplay
          points={points}
          onGridClick={handleGridClick}
          onPointClick={handlePointClickForRemoval}
          onSecretPointRemove={handleSecretEndgameRemoval} 
          analysisMode={analysisMode}
          displayTriangle={currentDisplayTriangle}
          idealOrangePointId={dejaVuIdealOrangePointId}
          dejaVuSequenceActive={dejaVuSequenceActive}
          showAreaAndPerimeter={showAreaAndPerimeter}
          triggerGridAnimation={triggerGridAnimation}
          triggerIdealEndgameCueAnimation={triggerIdealEndgameCueAnimation}
          isPovChanging={isPovChanging}
          isInteractiveForAdding={canAddPointsToGrid}
          canRemovePointStd={dejaVuSequenceActive && points.length > MIN_POINTS_REMAINING_AFTER_REMOVAL && !isProcessing && !finalAnimatingPointIds}
          isDisplayTriangleMember={isDisplayTriangleMember}
          maxPoints={MAX_POINTS}
          minPointsRemainingAfterRemoval={MIN_POINTS_REMAINING_AFTER_REMOVAL}
          idealSurvivorEndgamePerimeter={idealSurvivorEndgamePerimeter}
          idealKillerEndgamePerimeter={idealKillerEndgamePerimeter}
          finalAnimatingPointIds={finalAnimatingPointIds} 
          isFinalEscapeSequenceActive={isFinalEscapeSequenceActive}
        />
      </main>

      <footer className="mt-8 pt-6 border-t border-slate-300">
        <Controls
          onReset={handleReset}
          onUndo={handleUndoLastAction}
          canUndo={history.length > 0 && !isProcessing && !finalAnimatingPointIds}
          isProcessing={isProcessing || !!finalAnimatingPointIds} 
          pointCount={points.length}
          dejaVuSequenceActive={dejaVuSequenceActive}
          requiredPointsForSequence={REQUIRED_POINTS_FOR_DEJAVU_SEQUENCE}
          currentMode={analysisMode}
          onModeChange={handleModeChange}
          isPovLocked={isPovLocked} 
          finalAnimating={!!finalAnimatingPointIds}
        />
      </footer>
    </div>
  );
};

export default App;