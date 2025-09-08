import { type GeometryData } from "./geoConverter";

/**
 * Calculates the centroid and bounding box of a set of vertices.
 * It uses the proper formula for closed polygons and a bounding box
 * center for open polylines.
 * @param vertices The array of [x, y] coordinates.
 * @param isPolygon True if the vertices form a closed polygon.
 * @returns An object with the centroid coordinates, and the bounding box width and height.
 */
function getGeometricInfo(
  vertices: [number, number][],
  isPolygon: boolean
): {
  centroid: { x: number; y: number };
  bboxHeight: number;
  bboxWidth: number;
} {
  if (vertices.length === 0) {
    return { centroid: { x: 0, y: 0 }, bboxHeight: 0, bboxWidth: 0 };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  vertices.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  const bboxHeight = maxY - minY;
  const bboxWidth = maxX - minX;
  const bboxCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  // For open shapes (LineString) or single points, the center of the bounding box is a good enough centroid.
  if (!isPolygon || vertices.length < 3) {
    return {
      centroid: bboxCenter,
      bboxHeight,
      bboxWidth,
    };
  }

  // For polygons, calculate the true centroid.
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n]; // Wrap around for the last segment
    const crossProduct = p1[0] * p2[1] - p2[0] * p1[1];
    area += crossProduct;
    cx += (p1[0] + p2[0]) * crossProduct;
    cy += (p1[1] + p2[1]) * crossProduct;
  }

  const signedArea = area / 2;

  // Fallback to bounding box center for polygons with no area (e.g., a line)
  if (Math.abs(signedArea) < 1e-9) {
    return {
      centroid: bboxCenter,
      bboxHeight,
      bboxWidth,
    };
  }

  return {
    centroid: { x: cx / (6 * signedArea), y: cy / (6 * signedArea) },
    bboxHeight,
    bboxWidth,
  };
}

/**
 * Determines if a point is inside a polygon using the ray-casting algorithm.
 * @param point The point to check, as [x, y].
 * @param vs The vertices of the polygon.
 * @returns True if the point is inside the polygon.
 */
function pointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[0],
    y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0],
      yi = vs[i][1];
    const xj = vs[j][0],
      yj = vs[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Finds a suitable point for a label inside a polygon, near its longest edge.
 * @param vertices The polygon's vertices.
 * @param textHeight The height of the text label, used for offsetting.
 * @returns The coordinates {x, y} for the text label.
 */
function findInternalPointNearLongestEdge(
  vertices: [number, number][],
  textHeight: number
): { x: number; y: number } {
  if (vertices.length < 3) {
    return getGeometricInfo(vertices, false).centroid;
  }

  let longestEdgeIndex = -1;
  let maxLenSq = 0;

  // 1. Find the longest edge
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq > maxLenSq) {
      maxLenSq = lenSq;
      longestEdgeIndex = i;
    }
  }

  const p1 = vertices[longestEdgeIndex];
  const p2 = vertices[(longestEdgeIndex + 1) % vertices.length];

  // 2. Calculate midpoint of the longest edge
  const midX = (p1[0] + p2[0]) / 2;
  const midY = (p1[1] + p2[1]) / 2;

  // 3. Calculate a normal vector
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.sqrt(maxLenSq);
  const normX = -dy / len; // Perpendicular vector
  const normY = dx / len;

  // 4. Create two candidate points, offset from the midpoint
  const offset = textHeight * 1.5; // Offset by 1.5x text height
  const candidate1: [number, number] = [
    midX + normX * offset,
    midY + normY * offset,
  ];
  const candidate2: [number, number] = [
    midX - normX * offset,
    midY - normY * offset,
  ];

  // 5. Test which candidate is inside the polygon
  if (pointInPolygon(candidate1, vertices)) {
    return { x: candidate1[0], y: candidate1[1] };
  }
  if (pointInPolygon(candidate2, vertices)) {
    return { x: candidate2[0], y: candidate2[1] };
  }

  // Fallback: if both fail, try a smaller offset
  const fallbackOffset = textHeight * 0.75;
  const fallback1: [number, number] = [
    midX + normX * fallbackOffset,
    midY + normY * fallbackOffset,
  ];
  if (pointInPolygon(fallback1, vertices)) {
    return { x: fallback1[0], y: fallback1[1] };
  }
  const fallback2: [number, number] = [
    midX - normX * fallbackOffset,
    midY - normY * fallbackOffset,
  ];
  if (pointInPolygon(fallback2, vertices)) {
    return { x: fallback2[0], y: fallback2[1] };
  }

  // Ultimate fallback: centroid
  return getGeometricInfo(vertices, true).centroid;
}

/**
 * Creates a DXF file containing multiple plot geometries.
 * @param plots An array of objects, each containing geometry and a plotId.
 * @returns A Blob containing the DXF file content.
 */
export function createMultiPlotDXFFile(
  plots: { geometry: GeometryData; plotId: string }[]
): Blob {
  // 1. Extract all vertices from all plots to calculate overall view parameters
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  plots.forEach(({ geometry }) => {
    let vertices: [number, number][] = [];
    switch (geometry.type) {
      case "Polygon":
        vertices = geometry.coordinates[0] as [number, number][];
        break;
      case "LineString":
        vertices = geometry.coordinates as [number, number][];
        break;
      case "Point":
        vertices = [geometry.coordinates as [number, number]];
        break;
    }
    vertices.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });

  if (!isFinite(minX)) {
    // No geometries to draw
    return new Blob([""], { type: "application/dxf" });
  }

  // 2. Calculate VPORT parameters from the overall bounding box
  const overallBboxHeight = maxY - minY;
  const viewHeight = Math.max(10, overallBboxHeight * 1.2); // 20% padding
  const viewCenterX = (minX + maxX) / 2;
  const viewCenterY = (minY + maxY) / 2;
  const aspectRatio = 1.5;

  // 3. Build the "normalized" DXF header and tables
  let dxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$INSUNITS
70
6
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
VPORT
70
1
0
VPORT
2
*ACTIVE
70
0
10
0.0
20
0.0
11
${(viewHeight * aspectRatio).toFixed(4)}
21
${viewHeight.toFixed(4)}
12
${viewCenterX.toFixed(4)}
22
${viewCenterY.toFixed(4)}
40
${viewHeight.toFixed(4)}
41
${aspectRatio}
71
0
72
100
0
ENDTAB
0
TABLE
2
LTYPE
70
1
0
LTYPE
2
CONTINUOUS
70
64
3
Solid line
72
65
73
0
40
0.0
0
ENDTAB
0
TABLE
2
LAYER
70
1
0
LAYER
2
0
70
64
62
7
6
CONTINUOUS
0
ENDTAB
0
TABLE
2
STYLE
70
1
0
STYLE
2
STANDARD
70
0
40
0.0
41
1.0
50
0.0
71
0
42
1.0
3
txt
4

0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // 4. Iterate through each plot and add its geometry and text to the ENTITIES section
  plots.forEach(({ geometry, plotId }) => {
    const { type, coordinates } = geometry;
    const plotNumber = plotId.split(".").pop();

    let plotVertices: [number, number][] = [];
    let isPolygon = false;

    switch (type) {
      case "Polygon":
        const ring = coordinates[0] as [number, number][];
        plotVertices = ring;
        isPolygon = true;
        dxfContent += `0
POLYLINE
8
0
66
1
70
1
`; // 70 flag 1 = Closed polyline
        ring.forEach(([x, y]) => {
          dxfContent += `0
VERTEX
8
0
10
${x.toFixed(4)}
20
${y.toFixed(4)}
`;
        });
        dxfContent += `0
SEQEND
`;
        break;

      case "LineString":
        const points = coordinates as [number, number][];
        plotVertices = points;
        dxfContent += `0
POLYLINE
8
0
66
1
70
0
`; // 70 flag 0 = Open polyline
        points.forEach(([x, y]) => {
          dxfContent += `0
VERTEX
8
0
10
${x.toFixed(4)}
20
${y.toFixed(4)}
`;
        });
        dxfContent += `0
SEQEND
`;
        break;

      case "Point":
        const [x, y] = coordinates as [number, number];
        plotVertices = [[x, y]];
        dxfContent += `0
POINT
8
0
10
${x.toFixed(4)}
20
${y.toFixed(4)}
`;
        break;
    }

    if (plotNumber && plotVertices.length > 0) {
      const { bboxHeight, bboxWidth } = getGeometricInfo(
        plotVertices,
        isPolygon
      );
      const smallerDim = Math.min(bboxWidth, bboxHeight);
      const textHeight = Math.max(1.0, smallerDim / 25);

      let textPosition: { x: number; y: number };

      if (isPolygon && plotVertices.length > 2) {
        textPosition = findInternalPointNearLongestEdge(
          plotVertices,
          textHeight
        );
      } else {
        // Fallback to centroid for points or lines
        textPosition = getGeometricInfo(plotVertices, isPolygon).centroid;
      }

      dxfContent += `0
TEXT
8
0
10
${textPosition.x.toFixed(4)}
20
${textPosition.y.toFixed(4)}
40
${textHeight.toFixed(4)}
1
${plotNumber}
72
4
73
2
`;
    }
  });

  // 5. Add footer
  dxfContent += `0
ENDSEC
0
EOF
`;

  return new Blob([dxfContent], { type: "application/dxf" });
}

/**
 * Creates a DXF file for a single plot geometry.
 * This is a convenience wrapper around createMultiPlotDXFFile.
 * @param geometry The geometry data.
 * @param plotId The ID of the plot.
 * @returns A Blob containing the DXF file content.
 */
export function createDXFFile(
  geometry: GeometryData,
  plotId: string
): Blob {
  return createMultiPlotDXFFile([{ geometry, plotId }]);
}
