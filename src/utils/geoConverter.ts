import { parseWKB, type GeometryData as WKBGeometryData } from "./wkbParser";
import { createDXFFile as createDXF } from "./dxfWriter";

// Re-export the type for external use in App.tsx
export type GeometryData = WKBGeometryData;

/**
 * Parses the raw text response from the ULDK API.
 * The API returns a status code on the first line and WKB data on the second.
 * A status of '0' indicates success.
 * @param data The raw string data from the fetch response.
 * @returns The parsed geometry data object.
 */
export function parseULDKResponse(data: string): GeometryData {
  const lines = data.trim().split('\n');

  // Check for error response from ULDK API
  if (lines.length < 2 || lines[0].trim() !== '0') {
    // The second line might contain an error message, join them for clarity.
    throw new Error(`Invalid ULDK API response: ${lines.join(' ')}`);
  }

  const wkbHex = lines[1].trim();
  if (!wkbHex) {
    throw new Error("Empty WKB data from ULDK API");
  }

  return parseWKB(wkbHex);
}

/**
 * A wrapper for the DXF creation utility.
 * @param geometry The geometry data to convert.
 * @returns A Blob containing the DXF file content.
 */
export function createDXFFile(geometry: GeometryData): Blob {
  return createDXF(geometry);
}
