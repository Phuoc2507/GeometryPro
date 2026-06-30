import { GeometryData } from '@/types/geometry';

/**
 * Returns a scaled copy of the geometry data if the coordinates are too large.
 * This keeps the geometry within standard bounds [-8, 8] for rendering and projection.
 */
export function scaleGeometry(geometry: GeometryData | null): GeometryData | null {
  if (!geometry) return null;

  const resolveCoord = (obj: any, prop: 'x' | 'y' | 'z') => {
    if (typeof obj === 'string') {
      const pt = geometry.points?.find((p: any) => p.id === obj);
      return Number(pt?.[prop]) || 0;
    }
    return Number(obj?.[prop]) || 0;
  };

  const getPoint = (obj: any) => {
    if (typeof obj === 'string') {
      const pt = geometry.points?.find((p: any) => p.id === obj);
      if (pt) {
        return {
          ...pt,
          x: Number(pt.x) || 0,
          y: Number(pt.y) || 0,
          z: Number(pt.z) || 0,
        };
      }
      return { x: 0, y: 0, z: 0 };
    }
    if (obj) {
      return {
        ...obj,
        x: Number(obj.x) || 0,
        y: Number(obj.y) || 0,
        z: Number(obj.z) || 0,
      };
    }
    return { x: 0, y: 0, z: 0 };
  };

  let maxVal = 0;

  if (geometry.points) {
    geometry.points.forEach((p: any) => {
      maxVal = Math.max(maxVal, Math.abs(Number(p.x) || 0));
      maxVal = Math.max(maxVal, Math.abs(Number(p.y) || 0));
      maxVal = Math.max(maxVal, Math.abs(Number(p.z) || 0));
    });
  }

  if (geometry.spheres) {
    geometry.spheres.forEach((s: any) => {
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(s.center, 'x')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(s.center, 'y')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(s.center, 'z')));
      maxVal = Math.max(maxVal, Math.abs(Number(s.radius) || 0));
    });
  }

  if (geometry.circles) {
    geometry.circles.forEach((c: any) => {
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(c.center, 'x')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(c.center, 'y')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(c.center, 'z')));
      maxVal = Math.max(maxVal, Math.abs(Number(c.radius) || 0));
    });
  }

  if (geometry.cylinders) {
    geometry.cylinders.forEach((cy: any) => {
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(cy.center1, 'x')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(cy.center1, 'y')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(cy.center1, 'z')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(cy.center2, 'x')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(cy.center2, 'y')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(cy.center2, 'z')));
      maxVal = Math.max(maxVal, Math.abs(Number(cy.radius) || 0));
    });
  }

  if (geometry.cones) {
    geometry.cones.forEach((co: any) => {
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(co.apex, 'x')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(co.apex, 'y')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(co.apex, 'z')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(co.baseCenter, 'x')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(co.baseCenter, 'y')));
      maxVal = Math.max(maxVal, Math.abs(resolveCoord(co.baseCenter, 'z')));
      maxVal = Math.max(maxVal, Math.abs(Number(co.radius) || 0));
    });
  }

  const resolveAndScale = (geometryObj: any) => {
    // If not scaling, we still want to resolve string IDs to objects
    if (maxVal <= 20) {
      return {
        ...geometryObj,
        points: geometryObj.points?.map((p: any) => ({
          ...p,
          x: Number(p.x) || 0,
          y: Number(p.y) || 0,
          z: Number(p.z) || 0,
        })) || [],
        spheres: geometryObj.spheres?.map((s: any) => ({ ...s, center: getPoint(s.center), radius: Number(s.radius) || 0 })),
        circles: geometryObj.circles?.map((c: any) => ({ ...c, center: getPoint(c.center), radius: Number(c.radius) || 0 })),
        cylinders: geometryObj.cylinders?.map((cy: any) => ({ ...cy, center1: getPoint(cy.center1), center2: getPoint(cy.center2), radius: Number(cy.radius) || 0 })),
        cones: geometryObj.cones?.map((co: any) => ({ ...co, apex: getPoint(co.apex), baseCenter: getPoint(co.baseCenter), radius: Number(co.radius) || 0 })),
        planes: geometryObj.planes?.map((pl: any) => ({ ...pl, points: pl.points?.map((pt: any) => getPoint(pt)) || [] })),
      };
    }

    const scaleFactor = maxVal / 8;
    const scaleCoords = (obj: any) => {
      const pt = getPoint(obj);
      if (!pt) return pt;
      return {
        x: (Number(pt.x) || 0) / scaleFactor,
        y: (Number(pt.y) || 0) / scaleFactor,
        z: (Number(pt.z) || 0) / scaleFactor,
      };
    };

    return {
      ...geometryObj,
      points: geometryObj.points?.map((p: any) => ({
        ...p,
        x: (Number(p.x) || 0) / scaleFactor,
        y: (Number(p.y) || 0) / scaleFactor,
        z: (Number(p.z) || 0) / scaleFactor,
      })) || [],
      spheres: geometryObj.spheres?.map((s: any) => ({
        ...s,
        center: scaleCoords(s.center),
        radius: (Number(s.radius) || 0) / scaleFactor,
      })),
      circles: geometryObj.circles?.map((c: any) => ({
        ...c,
        center: scaleCoords(c.center),
        radius: (Number(c.radius) || 0) / scaleFactor,
      })),
      cylinders: geometryObj.cylinders?.map((cy: any) => ({
        ...cy,
        center1: scaleCoords(cy.center1),
        center2: scaleCoords(cy.center2),
        radius: (Number(cy.radius) || 0) / scaleFactor,
      })),
      cones: geometryObj.cones?.map((co: any) => ({
        ...co,
        apex: scaleCoords(co.apex),
        baseCenter: scaleCoords(co.baseCenter),
        radius: (Number(co.radius) || 0) / scaleFactor,
      })),
      planes: geometryObj.planes?.map((pl: any) => ({
        ...pl,
        points: pl.points?.map((pt: any) => scaleCoords(pt)) || [],
      })),
      curves: geometryObj.curves?.map((curve: any) => {
        if (!curve.params) return curve;
        const p = { ...curve.params };
        if (p.xMin !== undefined) p.xMin /= scaleFactor;
        if (p.xMax !== undefined) p.xMax /= scaleFactor;
        
        if (curve.type === 'parabola') {
          if (p.a !== undefined) p.a *= scaleFactor;
          if (p.c !== undefined) p.c /= scaleFactor;
        } else if (curve.type === 'cubic') {
          if (p.a !== undefined) p.a *= scaleFactor * scaleFactor;
          if (p.b !== undefined) p.b *= scaleFactor;
          if (p.d !== undefined) p.d /= scaleFactor;
        } else if (curve.type === 'rational') {
          if (p.numB !== undefined) p.numB /= scaleFactor;
          if (p.denA !== undefined) p.denA *= scaleFactor;
        }
        
        return { ...curve, params: p };
      }),
    };
  };

  return resolveAndScale(geometry);
}
