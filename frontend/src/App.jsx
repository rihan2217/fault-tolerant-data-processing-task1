import { useState } from "react";
import EventForm from "./components/EventForm";
import EventList from "./components/EventList";
import AggregateView from "./components/AggregateView";

function App() {
  const [activeTab, setActiveTab] = useState("submit");
  const [refresh, setRefresh] = useState(0);

  const handleEventSubmitted = () => setRefresh(r => r + 1);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">⚡ Fault-Tolerant Data Processing System</h1>
        <p className="text-gray-400 text-sm mt-1">Event ingestion, normalization and aggregation</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {["submit", "events", "aggregate"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "submit" ? "Submit Event" : tab === "events" ? "View Events" : "Aggregates"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {activeTab === "submit" && <EventForm onSubmitted={handleEventSubmitted} />}
        {activeTab === "events" && <EventList refresh={refresh} />}
        {activeTab === "aggregate" && <AggregateView refresh={refresh} />}
      </div>
    </div>
  );
}

export default App;
