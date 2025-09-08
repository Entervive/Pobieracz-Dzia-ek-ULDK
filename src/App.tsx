import React, { useState } from "react";
import { Download, MapPin, TestTube, DownloadCloud } from "lucide-react";
import { parseULDKResponse, type GeometryData } from "./utils/geoConverter";
import { createDXFFile, createMultiPlotDXFFile } from "./utils/dxfWriter";

function App() {
  const [plotId, setPlotId] = useState("");
  const [format, setFormat] = useState("DXF");
  const [isLoading, setIsLoading] = useState(false);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [showPlot, setShowPlot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleShowPlot = () => {
    if (!plotId) {
      setError("Please enter a valid plot ID");
      return;
    }
    setShowPlot(true);
  };

  const handleTest = async () => {
    if (!plotId) {
      setError("Please enter a valid plot ID");
      return;
    }
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      const response = await fetch(
        `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${plotId}&srid=2180`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      setDebugInfo(`ULDK Response (first 500 chars): ${data.substring(0, 500)}`);

      if (!data || data.trim() === "") {
        throw new Error("Empty response from ULDK API");
      }

      const geometry = parseULDKResponse(data);
      setError(null);
      setDebugInfo(
        (prev) =>
          prev +
          `\n\nParsed successfully!\nGeometry Type: ${geometry.type}\nCoordinates Count: ${geometry.coordinates.length}`
      );
    } catch (error) {
      console.error("Error testing plot:", error);
      setError(
        `Test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!plotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${plotId}&srid=2180`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();

      if (!data || data.trim() === "") {
        throw new Error("Empty response from ULDK API");
      }

      const geometry = parseULDKResponse(data);

      if (format === "DXF") {
        const blob = createDXFFile(geometry, plotId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `plot_${plotId}.dxf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error("DWG format is not supported in this environment");
      }
    } catch (error) {
      console.error("Error downloading plot:", error);
      setError(
        `Failed to download plot: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadNearby = async () => {
    if (!plotId) return;
    setIsNearbyLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      // 1. Fetch the central plot to get its geometry
      const centralPlotResponse = await fetch(
        `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${plotId}&srid=2180`
      );
      const centralPlotDataText = await centralPlotResponse.text();
      const centralPlotGeom = parseULDKResponse(centralPlotDataText);

      if (centralPlotGeom.type !== "Polygon") {
        throw new Error("Nearby plot search only works for polygon geometries.");
      }

      const ring = centralPlotGeom.coordinates[0] as [number, number][];
      const neighborQueries: Promise<string | null>[] = [];

      // 2. For each segment of the polygon, query for a neighbor
      for (let i = 0; i < ring.length - 1; i++) {
        const p1 = ring[i];
        const p2 = ring[i + 1];

        const midX = (p1[0] + p2[0]) / 2;
        const midY = (p1[1] + p2[1]) / 2;

        const vecX = p2[0] - p1[0];
        const vecY = p2[1] - p1[1];
        const len = Math.sqrt(vecX * vecX + vecY * vecY);
        if (len === 0) continue;

        // Outward normal vector
        const normX = -vecY / len;
        const normY = vecX / len;

        // Query point 1 meter away from the boundary midpoint
        const queryX = midX + normX * 1;
        const queryY = midY + normY * 1;

        const query = fetch(
          `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${queryX.toFixed(
            2
          )},${queryY.toFixed(2)}&srid=2180&result=id`
        )
          .then((res) => res.text())
          .then((text) => {
            const lines = text.trim().split("\n");
            if (lines.length > 1 && lines[0].trim() === "0") {
              return lines[1].trim(); // return plot ID
            }
            return null;
          })
          .catch(() => null);

        neighborQueries.push(query);
      }

      // 3. Collect unique plot IDs and show them to the user
      const neighborIds = await Promise.all(neighborQueries);
      const uniqueIds = new Set<string>([
        plotId,
        ...neighborIds.filter((id): id is string => id !== null),
      ]);
      const uniqueIdsArray = Array.from(uniqueIds);
      setDebugInfo(
        `Found ${
          uniqueIdsArray.length
        } unique plots. Fetching details...\nIDs: ${uniqueIdsArray.join(", ")}`
      );

      // 4. Fetch full geometry for all unique plots, collecting errors
      const parsingErrors: string[] = [];
      const plotFetchPromises = uniqueIdsArray.map((id) =>
        fetch(
          `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${id}&srid=2180`
        )
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then((text) => {
            try {
              const geometry = parseULDKResponse(text);
              return { plotId: id, geometry };
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : String(e);
              parsingErrors.push(`Could not process plot ${id}: ${errorMsg}`);
              console.warn(`Could not parse plot ${id}:`, text, e);
              return null;
            }
          })
          .catch((err) => {
            const errorMsg = err instanceof Error ? err.message : String(err);
            parsingErrors.push(`Could not fetch plot ${id}: ${errorMsg}`);
            console.error(`Error fetching plot ${id}:`, err);
            return null;
          })
      );

      const allPlotsData = (await Promise.all(plotFetchPromises)).filter(
        (p): p is { geometry: GeometryData; plotId: string } => p !== null
      );

      // Update debug info and report any errors
      setDebugInfo(
        (prev) =>
          prev +
          `\nSuccessfully fetched and parsed ${allPlotsData.length} plots.`
      );
      if (parsingErrors.length > 0) {
        setError(
          (prevError) =>
            (prevError ? prevError + "\n\n" : "") +
            "Encountered issues:\n" +
            parsingErrors.join("\n")
        );
      }

      if (allPlotsData.length === 0) {
        throw new Error(
          "Could not fetch any valid plot data. Check errors for details."
        );
      }

      // 5. Create and download the combined DXF file
      const blob = createMultiPlotDXFFile(allPlotsData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nearby_plots_${plotId}.dxf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading nearby plots:", error);
      setError(
        `Failed to download nearby plots: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsNearbyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
        <div className="text-center mb-8">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto" />
          <h1 className="text-3xl font-bold text-gray-800 mt-4">
            ULDK Plot Downloader
          </h1>
          <p className="text-gray-600 mt-2">
            Enter plot ID to view and download in DXF format
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {debugInfo && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-700">Debug Info:</h4>
            <pre className="text-xs text-blue-600 mt-1 whitespace-pre-wrap">
              {debugInfo}
            </pre>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label
              htmlFor="plotId"
              className="block text-sm font-medium text-gray-700"
            >
              Plot ID
            </label>
            <input
              type="text"
              id="plotId"
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter plot ID (e.g., 141201_1.0001.6509)"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleTest}
              disabled={!plotId || isLoading || isNearbyLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && !isNearbyLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <TestTube className="w-5 h-5 mr-2" />
                  Test
                </>
              )}
            </button>

            <button
              onClick={handleShowPlot}
              disabled={!plotId || isLoading || isNearbyLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Show
            </button>

            <button
              onClick={handleDownload}
              disabled={!plotId || isLoading || isNearbyLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && !isNearbyLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download
                </>
              )}
            </button>

            <button
              onClick={handleDownloadNearby}
              disabled={!plotId || isLoading || isNearbyLoading}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNearbyLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <DownloadCloud className="w-5 h-5 mr-2" />
                  Nearby
                </>
              )}
            </button>
          </div>

          {showPlot && plotId && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Plot Visualization
              </h2>
              <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src={`https://mapy.geoportal.gov.pl/imap/?identifyParcel=${plotId}`}
                  title="ULDK Plot Visualization"
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
