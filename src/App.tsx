import React, { useState } from "react";
import { Download, MapPin, TestTube } from "lucide-react";
import {
  parseULDKResponse,
  createDXFFile,
  type GeometryData,
} from "./utils/geoConverter";

function App() {
  const [plotId, setPlotId] = useState("");
  const [format, setFormat] = useState("DXF");
  const [isLoading, setIsLoading] = useState(false);
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
      console.log("ULDK Response:", data);

      setDebugInfo(`
Response Status: ${response.status}
Response Length: ${data.length}
Response Type: ${response.headers.get("content-type")}
First 200 chars: ${data.substring(0, 200)}
Last 200 chars: ${data.substring(Math.max(0, data.length - 200))}
Is Hex: ${/^[0-9A-Fa-f\s]+$/.test(data.trim())}
Contains Error: ${
        data.toLowerCase().includes("error") ||
        data.toLowerCase().includes("exception")
      }
      `);

      if (!data || data.trim() === "") {
        throw new Error("Empty response from ULDK API");
      }

      const geometry = parseULDKResponse(data);
      console.log("Parsed Geometry:", geometry);

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
      console.log("ULDK Response:", data);

      if (!data || data.trim() === "") {
        throw new Error("Empty response from ULDK API");
      }

      const geometry = parseULDKResponse(data);
      console.log("Parsed Geometry:", geometry);

      if (format === "DXF") {
        const blob = createDXFFile(geometry);
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
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {debugInfo && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-700">
                  Debug Info:
                </h4>
                <pre className="text-xs text-blue-600 mt-1 whitespace-pre-wrap">
                  {debugInfo}
                </pre>
              </div>
            </div>
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

          <div>
            <label
              htmlFor="format"
              className="block text-sm font-medium text-gray-700"
            >
              File Format
            </label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled
            >
              <option value="DXF">DXF</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              DWG format is not supported in this environment
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleTest}
              disabled={!plotId || isLoading}
              className="w-1/3 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <TestTube className="w-5 h-5 mr-2" />
                  Test API
                </>
              )}
            </button>

            <button
              onClick={handleShowPlot}
              disabled={!plotId}
              className="w-1/3 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Show Plot
            </button>

            <button
              onClick={handleDownload}
              disabled={!plotId || isLoading}
              className="w-1/3 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Plot
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
