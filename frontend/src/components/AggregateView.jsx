import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AggregateView({ refresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/aggregate`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  if (loading) return <p className="text-gray-400">Loading aggregates...</p>;
  if (!data) return <p className="text-red-400">Failed to load aggregates</p>;

  const statusMap = {};
  data.statusBreakdown?.forEach(s => { statusMap[s._id] = s.count; });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Aggregated Results</h2>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{data.overall?.totalEvents || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Total Events</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{data.overall?.totalAmount?.toFixed(2) || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Total Amount</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{data.overall?.avgAmount?.toFixed(2) || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Avg Amount</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="font-medium mb-3">Status Breakdown</h3>
        <div className="flex gap-4">
          <span className="text-green-400 text-sm">✅ Processed: {statusMap.processed || 0}</span>
          <span className="text-red-400 text-sm">❌ Failed: {statusMap.failed || 0}</span>
          <span className="text-yellow-400 text-sm">⚠️ Rejected: {statusMap.rejected || 0}</span>
        </div>
      </div>

      {/* By Client */}
      {data.byClient?.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">By Client</h3>
          <div className="space-y-3">
            {data.byClient.map(client => (
              <div key={client._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-white">{client._id}</span>
                  <span className="text-blue-400 text-sm">{client.eventCount} events</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                  <div><span className="text-gray-500">Total Amount:</span> {client.totalAmount?.toFixed(2)}</div>
                  <div><span className="text-gray-500">Avg Amount:</span> {client.avgAmount?.toFixed(2)}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Metrics: {client.metrics?.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
