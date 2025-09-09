import { Point } from '../types';

// Renamed for clarity to avoid conflict if 'distance' is used as a var name.
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getPerimeter = (trianglePoints: [Point, Point, Point]): number => {
  return (
    distance(trianglePoints[0], trianglePoints[1]) +
    distance(trianglePoints[1], trianglePoints[2]) +
    distance(trianglePoints[2], trianglePoints[0])
  );
};

export const getCombinations = <T,>(arr: T[], k: number): T[][] => {
  const result: T[][] = [];
  const combo = (temp: T[], start: number) => {
    if (temp.length === k) {
      result.push([...temp]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      temp.push(arr[i]);
      combo(temp, i + 1);
      temp.pop();
    }
  };
  combo([], 0);
  return result;
};
