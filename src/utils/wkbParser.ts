// utils/wkbParser.ts
export interface GeometryData {
  type: string;
  coordinates: any;
  srid?: number;
}

export class WKBParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;
  private littleEndian: boolean = true;
  private srid?: number;

  constructor(data: ArrayBuffer | string) {
    if (typeof data === 'string') {
      this.buffer = this.hexStringToArrayBuffer(data);
    } else {
      this.buffer = data;
    }
    this.view = new DataView(this.buffer);
  }

  private hexStringToArrayBuffer(hex: string): ArrayBuffer {
    hex = hex.replace(/\s/g, '');
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }

    const buffer = new ArrayBuffer(hex.length / 2);
    const view = new Uint8Array(buffer);
    
    for (let i = 0; i < hex.length; i += 2) {
      view[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    
    return buffer;
  }

  private checkOffset(byteLength: number): void {
    if (this.offset + byteLength > this.buffer.byteLength) {
      throw new Error(`Attempt to read beyond buffer bounds: offset=${this.offset}, byteLength=${byteLength}, bufferLength=${this.buffer.byteLength}`);
    }
  }

  private parseEndianness(): void {
    this.checkOffset(1);
    const endian = this.view.getUint8(this.offset);
    this.littleEndian = endian === 1;
    this.offset += 1;
  }

  private readUInt32(): number {
    this.checkOffset(4);
    const value = this.view.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  private readFloat64(): number {
    this.checkOffset(8);
    const value = this.view.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }

  private readPoint(): [number, number] {
    const x = this.readFloat64();
    const y = this.readFloat64();
    return [x, y];
  }

  private readLineString(): number[][] {
    const numPoints = this.readUInt32();
    const points: number[][] = [];
    
    for (let i = 0; i < numPoints; i++) {
      // Check if there are enough bytes for a full point (16 bytes).
      // Some WKB producers might not include the redundant closing point for polygons,
      // even if it's counted in numPoints.
      if (this.offset + 16 > this.buffer.byteLength) {
        break;
      }
      points.push(this.readPoint());
    }
    
    return points;
  }

  private readPolygon(): number[][][] {
    const numRings = this.readUInt32();
    const rings: number[][][] = [];
    
    for (let i = 0; i < numRings; i++) {
      rings.push(this.readLineString());
    }
    
    return rings;
  }

  private readHeaderAndParseGeometry(isSubGeometry: boolean = false) {
    this.parseEndianness();

    let geometryType = this.readUInt32();
    
    // Handle SRID flag and extract base type
    const hasSRID = (geometryType & 0x20000000) !== 0;
    if (hasSRID && !isSubGeometry) {
      this.srid = this.readUInt32();
    }
    
    // Mask out SRID flag and Z/M flags to get base type
    const baseType = geometryType & 0x000000FF;
    
    let coordinates;
    let typeName;

    switch (baseType) {
      case 1: typeName = 'Point'; coordinates = this.readPoint(); break;
      case 2: typeName = 'LineString'; coordinates = this.readLineString(); break;
      case 3: typeName = 'Polygon'; coordinates = this.readPolygon(); break;
      case 4: typeName = 'MultiPoint'; coordinates = this.readMultiPoint(); break;
      case 5: typeName = 'MultiLineString'; coordinates = this.readMultiLineString(); break;
      case 6: typeName = 'MultiPolygon'; coordinates = this.readMultiPolygon(); break;
      default:
        throw new Error(`Unsupported geometry type: ${geometryType}`);
    }

    return { type: typeName, coordinates };
  }

  private readMultiPoint(): number[][] {
    const numPoints = this.readUInt32();
    const points: number[][] = [];
    for (let i = 0; i < numPoints; i++) {
      const subGeom = this.readHeaderAndParseGeometry(true);
      points.push(subGeom.coordinates);
    }
    return points;
  }

  private readMultiLineString(): number[][][] {
    const numLineStrings = this.readUInt32();
    const lineStrings: number[][][] = [];
    for (let i = 0; i < numLineStrings; i++) {
      const subGeom = this.readHeaderAndParseGeometry(true);
      lineStrings.push(subGeom.coordinates);
    }
    return lineStrings;
  }

  private readMultiPolygon(): number[][][][] {
    const numPolygons = this.readUInt32();
    const polygons: number[][][][] = [];
    for (let i = 0; i < numPolygons; i++) {
      const subGeom = this.readHeaderAndParseGeometry(true);
      polygons.push(subGeom.coordinates);
    }
    return polygons;
  }

  public parse(): GeometryData {
    try {
      const geom = this.readHeaderAndParseGeometry(false);
      
      return {
        type: geom.type,
        coordinates: geom.coordinates,
        srid: this.srid,
      };
    } catch (error) {
      throw new Error(`Failed to parse WKB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export function parseWKB(data: string | ArrayBuffer): GeometryData {
  const parser = new WKBParser(data);
  return parser.parse();
}
