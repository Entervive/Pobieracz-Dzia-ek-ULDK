// utils/wkbParser.ts
export interface GeometryData {
  type: string
  coordinates: number[][]
}

export class WKBParser {
  private buffer: ArrayBuffer
  private view: DataView
  private offset: number = 0
  private littleEndian: boolean = true

  constructor(data: ArrayBuffer | string) {
    try {
      if (typeof data === 'string') {
        console.log('Converting hex string to ArrayBuffer...')
        // Convert hex string to ArrayBuffer
        this.buffer = this.hexStringToArrayBuffer(data)
      } else {
        this.buffer = data
      }
      this.view = new DataView(this.buffer)
      console.log('Buffer length:', this.buffer.byteLength)
      this.parseEndianness()
    } catch (error) {
      console.error('WKB Parser constructor error:', error)
      throw new Error(`Failed to initialize WKB parser: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private hexStringToArrayBuffer(hex: string): ArrayBuffer {
    // Remove any whitespace and ensure even length
    hex = hex.replace(/\s/g, '')
    if (hex.length % 2 !== 0) {
      hex = '0' + hex
    }

    const buffer = new ArrayBuffer(hex.length / 2)
    const view = new Uint8Array(buffer)
    
    for (let i = 0; i < hex.length; i += 2) {
      view[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    
    return buffer
  }

  private parseEndianness(): void {
    if (this.buffer.byteLength === 0) {
      throw new Error('Empty buffer - cannot parse endianness')
    }
    const endian = this.view.getUint8(0)
    this.littleEndian = endian === 1
    this.offset = 1
    console.log('Endianness:', this.littleEndian ? 'little' : 'big')
  }

  private readUInt32(): number {
    const value = this.view.getUint32(this.offset, this.littleEndian)
    this.offset += 4
    return value
  }

  private readFloat64(): number {
    const value = this.view.getFloat64(this.offset, this.littleEndian)
    this.offset += 8
    return value
  }

  private readPoint(): [number, number] {
    const x = this.readFloat64()
    const y = this.readFloat64()
    return [x, y]
  }

  private readLineString(): number[][] {
    const numPoints = this.readUInt32()
    const points: number[][] = []
    
    for (let i = 0; i < numPoints; i++) {
      points.push(this.readPoint())
    }
    
    return points
  }

  private readPolygon(): number[][][] {
    const numRings = this.readUInt32()
    const rings: number[][][] = []
    
    for (let i = 0; i < numRings; i++) {
      rings.push(this.readLineString())
    }
    
    return rings
  }

  public parse(): GeometryData {
    try {
      if (this.buffer.byteLength < 5) {
        throw new Error(`Buffer too small: ${this.buffer.byteLength} bytes (minimum 5 required)`)
      }
      
      const geometryType = this.readUInt32()
      console.log('Geometry type:', geometryType)
      
      switch (geometryType) {
        case 1: // Point
          const point = this.readPoint()
          return {
            type: 'Point',
            coordinates: [point]
          }
        
        case 2: // LineString
          const lineString = this.readLineString()
          return {
            type: 'LineString',
            coordinates: lineString
          }
        
        case 3: // Polygon
          const polygon = this.readPolygon()
          return {
            type: 'Polygon',
            coordinates: polygon
          }
        
        case 4: // MultiPoint
          const numPoints = this.readUInt32()
          const points: number[][] = []
          for (let i = 0; i < numPoints; i++) {
            this.offset += 5 // Skip endianness and geometry type for each point
            points.push(this.readPoint())
          }
          return {
            type: 'MultiPoint',
            coordinates: points
          }
        
        case 5: // MultiLineString
          const numLineStrings = this.readUInt32()
          const lineStrings: number[][][] = []
          for (let i = 0; i < numLineStrings; i++) {
            this.offset += 5 // Skip endianness and geometry type for each linestring
            lineStrings.push(this.readLineString())
          }
          return {
            type: 'MultiLineString',
            coordinates: lineStrings
          }
        
        case 6: // MultiPolygon
          const numPolygons = this.readUInt32()
          const polygons: number[][][][] = []
          for (let i = 0; i < numPolygons; i++) {
            this.offset += 5 // Skip endianness and geometry type for each polygon
            polygons.push(this.readPolygon())
          }
          return {
            type: 'MultiPolygon',
            coordinates: polygons
          }
        
        default:
          throw new Error(`Unsupported geometry type: ${geometryType}`)
      }
    } catch (error) {
      console.error('WKB parsing error:', error)
      throw new Error(`WKB parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Helper function to parse WKB data
export function parseWKB(data: string | ArrayBuffer): GeometryData {
  const parser = new WKBParser(data)
  return parser.parse()
}