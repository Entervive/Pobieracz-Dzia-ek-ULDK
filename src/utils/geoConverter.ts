import proj4 from 'proj4'
    import { DxfWriter } from 'dxf-writer'
    import { parseWKB, type GeometryData } from './wkbParser'

    proj4.defs([
      [
        'EPSG:2180',
        '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +units=m +no_defs'
      ],
      [
        'EPSG:4326',
        '+proj=longlat +datum=WGS84 +no_defs'
      ]
    ])

    export type { GeometryData }

    export function convertPUWGToWGS84(coordinates: number[]): number[] {
      return proj4('EPSG:2180', 'EPSG:4326', coordinates)
    }

    export function createDXFFile(geometry: GeometryData): Blob {
      const dxf = new DxfWriter()
      
      dxf.addLayer('PLOT', 1)
      dxf.setActiveLayer('PLOT')

      if (geometry.type === 'Point') {
        const point = convertPUWGToWGS84(geometry.coordinates[0])
        dxf.addPoint(point[0], point[1])
      } else if (geometry.type === 'LineString') {
        const points = geometry.coordinates.map(coord => convertPUWGToWGS84(coord))
        dxf.addPolyline(points)
      } else if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => {
          const points = ring.map(coord => convertPUWGToWGS84(coord))
          dxf.addPolyline(points)
        })
      } else if (geometry.type === 'MultiPoint') {
        geometry.coordinates.forEach(coord => {
          const point = convertPUWGToWGS84(coord)
          dxf.addPoint(point[0], point[1])
        })
      } else if (geometry.type === 'MultiLineString') {
        geometry.coordinates.forEach(lineString => {
          const points = lineString.map(coord => convertPUWGToWGS84(coord))
          dxf.addPolyline(points)
        })
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            const points = ring.map(coord => convertPUWGToWGS84(coord))
            dxf.addPolyline(points)
          })
        })
      }

      const dxfString = dxf.stringify()
      return new Blob([dxfString], { type: 'application/dxf' })
    }

    export function parseULDKResponse(data: string): GeometryData {
      try {
        const lines = data.trim().split('\n');
        const statusCode = lines[0].trim();
        const payload = lines.length > 1 ? lines[1].trim() : '';

        if (statusCode !== '0') {
          throw new Error(`ULDK API returned an error: ${payload || 'Unknown error'}`);
        }

        if (!payload) {
          throw new Error('Empty geometry data from ULDK API');
        }
        
        return parseWKB(payload);
      } catch (error) {
        console.error('Error parsing ULDK response:', error);
        throw new Error(`Failed to parse geometry data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
