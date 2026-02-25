import type { Coordinate, ParkingZoneData } from '../constants/types';

/**
 * Ray-casting algorithm to check if a point is inside a polygon.
 */
function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  const { latitude: y, longitude: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].latitude;
    const xi = polygon[i].longitude;
    const yj = polygon[j].latitude;
    const xj = polygon[j].longitude;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Finds which parking zone contains the given coordinate.
 * Returns null if the point is outside all zones.
 */
export function findZoneAtPoint(
  point: Coordinate,
  zones: ParkingZoneData[],
): ParkingZoneData | null {
  for (const zone of zones) {
    for (const polygon of zone.polygons) {
      if (isPointInPolygon(point, polygon)) {
        return zone;
      }
    }
  }
  return null;
}
