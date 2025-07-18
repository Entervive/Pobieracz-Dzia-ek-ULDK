import React, { useState } from "react";
import { Download, MapPin } from "lucide-react";
import { parseULDKResponse, createDXFFile } from "./utils/geoConverter";

function App() {
  const [plotId, setPlotId] = useState("");
  const [format, setFormat] = useState("DXF");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlot, setShowPlot] = useState(false);

  const handleDownload = async () => {
    if (!plotId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${plotId}`
      );
      if (response.ok) {
        const data = await response.text();
        const geometry = parseULDKResponse(data);

        if (format === "DXF") {
          const blob = createDXFFile(geometry);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `plot_${plotId}.dxf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          throw new Error("DWG format is not supported in this environment");
        }
      }
    } catch (error) {
      console.error("Error downloading plot:", error);
      alert("Failed to download plot. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPlot = () => {
    if (plotId) {
      setShowPlot(true);
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
              placeholder="Enter plot ID"
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
              onClick={handleShowPlot}
              disabled={!plotId}
              className="w-1/2 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Show Plot
            </button>

            <button
              onClick={handleDownload}
              disabled={!plotId || isLoading}
              className="w-1/2 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
