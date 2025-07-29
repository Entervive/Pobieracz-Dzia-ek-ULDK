import proj4 from 'proj4'
import { DxfWriter } from 'dxf-writer'
import { parseWKB, type GeometryData } from './wkbParser'

// Define PUWG 1992 (EPSG:2180) and WGS84 (EPSG:4326) projections
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
  
  // Start a new layer for the plot
  dxf.addLayer('PLOT', 1)
  dxf.setActiveLayer('PLOT')

  // Convert coordinates and add to DXF
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

  // Generate the DXF file
  const dxfString = dxf.stringify()
  return new Blob([dxfString], { type: 'application/dxf' })
}

export function parseULDKResponse(data: string): GeometryData {
  try {
    console.log('Raw ULDK response:', data)
    console.log('Response length:', data.length)
    console.log('First 100 chars:', data.substring(0, 100))
    
    // Clean the data - remove any whitespace and newlines
    const cleanData = data.trim().replace(/\s+/g, '')
    console.log('Cleaned data length:', cleanData.length)
    console.log('Cleaned first 100 chars:', cleanData.substring(0, 100))
    
    // Check if the response is empty or contains error message
    if (!cleanData || cleanData.length === 0) {
      throw new Error('Empty response from ULDK API')
    }
    
    // Check for common error messages
    if (cleanData.toLowerCase().includes('error') || 
        cleanData.toLowerCase().includes('exception') ||
        cleanData.toLowerCase().includes('not found')) {
      throw new Error(`ULDK API error: ${cleanData}`)
    }
    
    // Check if the response is WKB (binary data as hex string)
    // WKB should be a hex string with even length
    if (cleanData.match(/^[0-9A-Fa-f]+$/) && cleanData.length % 2 === 0) {
      console.log('Detected WKB format')
      return parseWKB(cleanData)
    }
    
    // If not WKB, try to parse as JSON or other formats
    try {
      const jsonData = JSON.parse(cleanData)
      if (jsonData.type && jsonData.coordinates) {
        console.log('Detected GeoJSON format')
        return jsonData as GeometryData
      }
    } catch (e) {
      // Not JSON, continue with other parsing attempts
    }
    
    // Check if it's WKT (Well-Known Text)
    if (cleanData.includes('POINT') || cleanData.includes('LINESTRING') || cleanData.includes('POLYGON')) {
      console.log('Detected WKT format')
      return parseWKT(cleanData)
    }
    
    // If all else fails, try to parse as WKB anyway (sometimes the format detection fails)
    try {
      console.log('Attempting to parse as WKB anyway...')
      return parseWKB(cleanData)
    } catch (wkbError) {
      console.error('WKB parsing failed:', wkbError)
    }
    
    throw new Error(`Unknown data format. Data: ${cleanData.substring(0, 200)}...`)
  } catch (error) {
    console.error('Error parsing ULDK response:', error)
    throw new Error(`Failed to parse geometry data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Simple WKT parser for basic geometry types
function parseWKT(wkt: string): GeometryData {
  const trimmed = wkt.trim()
  
  if (trimmed.startsWith('POINT')) {
    const coordsMatch = trimmed.match(/POINT\s*\(\s*([^)]+)\s*\)/)
    if (coordsMatch) {
      const coords = coordsMatch[1].split(/\s+/).map(Number)
      return {
        type: 'Point',
        coordinates: [coords]
      }
    }
  } else if (trimmed.startsWith('LINESTRING')) {
    const coordsMatch = trimmed.match(/LINESTRING\s*\(\s*([^)]+)\s*\)/)
    if (coordsMatch) {
      const coords = coordsMatch[1].split(',').map(pair => 
        pair.trim().split(/\s+/).map(Number)
      )
      return {
        type: 'LineString',
        coordinates: coords
      }
    }
  } else if (trimmed.startsWith('POLYGON')) {
    const coordsMatch = trimmed.match(/POLYGON\s*\(\s*\(([^)]+)\)\s*\)/)
    if (coordsMatch) {
      const coords = coordsMatch[1].split(',').map(pair => 
        pair.trim().split(/\s+/).map(Number)
      )
      return {
        type: 'Polygon',
        coordinates: [coords]
      }
    }
  }
  
  throw new Error('Unsupported WKT format')
}