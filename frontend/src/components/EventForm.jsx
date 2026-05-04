import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const defaultPayload = JSON.stringify({
  metric: "value",
  amount: "1200",
  timestamp: "2024/01/01"
}, null, 2);

export default function EventForm({ onSubmitted }) {
  const [source, setSource] = useState("client_A");
  const [payload, setPayload] = useState(defaultPayload);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      setError("Invalid JSON in payload");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, payload: parsedPayload, simulateFailure })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        onSubmitted();
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Submit Raw Event</h2>
        <p className="text-gray-400 text-sm mb-6">Send a raw event to the ingestion API. The system will normalize, deduplicate and store it.</p>
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Source / Client ID</label>
        <input
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          placeholder="client_A"
        />
      </div>

      {/* Payload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Payload (JSON)</label>
        <textarea
          value={payload}
          onChange={e => setPayload(e.target.value)}
          rows={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Simulate Failure Toggle */}
      <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
        <input
          type="checkbox"
          id="simulateFailure"
          checked={simulateFailure}
          onChange={e => setSimulateFailure(e.target.checked)}
          className="w-4 h-4 accent-red-500"
        />
        <label htmlFor="simulateFailure" className="text-sm text-gray-300">
          🔴 Simulate Database Failure
          <span className="text-gray-500 ml-2">(event will be marked as failed)</span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
      >
        {loading ? "Processing..." : "Submit Event"}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <p className="text-green-400 font-medium mb-2">✅ {result.message}</p>
          {result.deduplicated && <p className="text-yellow-400 text-sm">⚠️ Duplicate detected — event was skipped</p>}
          {result.warnings && <p className="text-yellow-400 text-sm">⚠️ Warnings: {result.warnings.join(", ")}</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}
    </div>
  );
}
