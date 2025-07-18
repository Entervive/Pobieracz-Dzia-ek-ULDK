import proj4 from 'proj4'
import { DxfWriter } from 'dxf-writer'

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

interface Geometry {
  type: string
  coordinates: number[][]
}

export function convertPUWGToWGS84(coordinates: number[]): number[] {
  return proj4('EPSG:2180', 'EPSG:4326', coordinates)
}

export function createDXFFile(geometry: Geometry): Blob {
  const dxf = new DxfWriter()
  
  dxf.addLayer('PLOT', 1)
  dxf.setActiveLayer('PLOT')

  if (geometry.type === 'LineString') {
    const points = geometry.coordinates.map(coord => convertPUWGToWGS84(coord))
    dxf.addPolyline(points)
  } else if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => {
      const points = ring.map(coord => convertPUWGToWGS84(coord))
      dxf.addPolyline(points)
    })
  }

  const dxfString = dxf.stringify()
  return new Blob([dxfString], { type: 'application/dxf' })
}

export function parseULDKResponse(data: string): Geometry {
  const wkt = data.trim()
  
  if (wkt.startsWith('LINESTRING')) {
    const coords = wkt
      .replace('LINESTRING(', '')
      .replace(')', '')
      .split(',')
      .map(coord => coord.trim().split(' ').map(Number))
    
    return {
      type: 'LineString',
      coordinates: coords
    }
  } else if (wkt.startsWith('POLYGON')) {
    const rings = wkt
      .replace('POLYGON((', '')
      .replace('))', '')
      .split('),(')
      .map(ring => 
        ring.split(',')
          .map(coord => coord.trim().split(' ').map(Number))
      )
    
    return {
      type: 'Polygon',
      coordinates: rings
    }
  }

  throw new Error('Unsupported geometry type')
}
