import { type GeometryData } from "./geoConverter";

export function createDXFFile(geometry: GeometryData): Blob {
  const { type, coordinates } = geometry;

  // DXF header
  let dxfContent = `999
DXF created by Bolt
0
SECTION
2
HEADER
9
$ACADVER
1
AC1018
0
ENDSEC
0
SECTION
2
TABLES
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
ENDSEC
0
SECTION
2
ENTITIES
`;

  // Handle different geometry types
  switch (type) {
    case 'Polygon':
      // Convert polygon to a closed POLYLINE
      const ring = coordinates[0]; // Take the outer ring
      dxfContent += `0
POLYLINE
8
0
66
1
70
1
`; // 70 flag 1 = Closed polyline
      ring.forEach(([x, y]: [number, number]) => {
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

    case 'LineString':
      // Convert to an open POLYLINE
      dxfContent += `0
POLYLINE
8
0
66
1
70
0
`; // 70 flag 0 = Open polyline
      coordinates.forEach(([x, y]: [number, number]) => {
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

    case 'Point':
      // Convert to POINT
      const [x, y] = coordinates;
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

    default:
      // In case of unsupported type, we don't throw an error,
      // just create a blank file so the download doesn't fail.
      console.error(`Unsupported geometry type for DXF conversion: ${type}`);
  }

  // DXF footer
  dxfContent += `0
ENDSEC
0
EOF
`;

  return new Blob([dxfContent], { type: "application/dxf" });
}
