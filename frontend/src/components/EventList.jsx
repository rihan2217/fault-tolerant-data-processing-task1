import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const statusColors = {
  processed: "bg-green-900/40 text-green-400 border-green-700",
  failed: "bg-red-900/40 text-red-400 border-red-700",
  rejected: "bg-yellow-900/40 text-yellow-400 border-yellow-700"
};

export default function EventList({ refresh }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const url = filter === "all"
          ? `${API}/api/events`
          : `${API}/api/events?status=${filter}`;
        const res = await fetch(url);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [refresh, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Processed Events</h2>
        <div className="flex gap-2">
          {["all", "processed", "failed", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                filter === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
          No events found. Submit an event to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{event.client_id}</span>
                <span className={`text-xs px-2 py-1 rounded border ${statusColors[event.status]}`}>
                  {event.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                <div><span className="text-gray-500">Metric:</span> {event.metric}</div>
                <div><span className="text-gray-500">Amount:</span> {event.amount}</div>
                <div><span className="text-gray-500">Time:</span> {new Date(event.timestamp).toLocaleDateString()}</div>
              </div>
              {event.failureReason && (
                <p className="text-red-400 text-xs mt-2">⚠️ {event.failureReason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
