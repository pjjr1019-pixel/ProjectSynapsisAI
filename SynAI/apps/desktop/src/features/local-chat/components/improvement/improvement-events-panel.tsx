import React from "react";
import type { ImprovementEvent } from "@contracts/improvement";
import { useImprovementEvents } from "../../hooks/useImprovementEvents";

interface ImprovementEventsPanelProps {
  className?: string;
  maxEvents?: number;
}

const riskColors: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-600",
  medium: "bg-yellow-600",
  low: "bg-blue-600"
};

const eventTypeLabels: Record<string, string> = {
  weak_reply: "Weak Reply",
  capability_gap: "Missing Capability",
  tool_failure: "Tool Failed",
  memory_candidate: "Memory Fact",
  repeated_request: "Repeated Request",
  feature_request: "Feature Request",
  needs_review: "Manual Review",
  unknown: "Unknown"
};

/**
 * Debug/inspection panel showing recent improvement events.
 * Non-intrusive: can be collapsed or hidden.
 * 
 * Uses IPC bridge to query events from main process —
 * renderer never directly owns file-backed improvement persistence.
 */
export const ImprovementEventsPanel: React.FC<ImprovementEventsPanelProps> = ({
  className = "",
  maxEvents = 5
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Use bridge hook to query improvement events
  const { events, loading, error } = useImprovementEvents({
    limit: maxEvents,
    autoRefreshMs: 5000,
    enabled: isExpanded // Only poll when expanded
  });

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-300 ${className}`}
        title="Show improvement analysis events"
      >
        {events.length > 0 ? `📊 ${events.length} improvements` : "📊 Improvements"}
      </button>
    );
  }

  return (
    <div
      className={`border border-gray-300 rounded p-3 bg-gray-50 text-xs max-h-64 overflow-y-auto ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-700 font-semibold">Improvement Events</span>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {loading && <div className="text-gray-400 mb-2">Loading...</div>}

      {error && <div className="text-red-500 mb-2 text-xs">Error: {error}</div>}

      {events.length === 0 && !loading && (
        <div className="text-gray-400 italic">No events detected yet</div>
      )}

      <div className="space-y-2">
        {events.map((event: ImprovementEvent) => (
          <div
            key={event.id}
            className="border border-gray-200 rounded p-2 bg-white text-xs space-y-1"
          >
            <div className="flex items-center gap-2">
              <span
                className={`${riskColors[event.risk] || "bg-gray-400"} text-white px-2 py-0.5 rounded text-xs font-medium`}
              >
                {event.risk}
              </span>
              <span className="font-semibold text-gray-800">
                {eventTypeLabels[event.type] || event.type}
              </span>
            </div>

            {event.payload?.userPromptExcerpt && (
              <div className="text-gray-600">
                <span className="font-medium">Prompt:</span> {event.payload.userPromptExcerpt.slice(0, 50)}
                {event.payload.userPromptExcerpt.length > 50 ? "..." : ""}
              </div>
            )}

            {event.payload?.assistantReplyExcerpt && (
              <div className="text-gray-600">
                <span className="font-medium">Reply:</span> {event.payload.assistantReplyExcerpt.slice(0, 50)}
                {event.payload.assistantReplyExcerpt.length > 50 ? "..." : ""}
              </div>
            )}

            {event.payload?.reasoning && (
              <div className="text-gray-500 italic">
                {event.payload.reasoning.slice(0, 60)}
                {event.payload.reasoning.length > 60 ? "..." : ""}
              </div>
            )}

            <div className="text-gray-400 text-xs">
              {event.recommendation} • {new Date(event.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div className="text-gray-400 text-xs mt-2 pt-2 border-t border-gray-200">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ImprovementEventsPanel;
