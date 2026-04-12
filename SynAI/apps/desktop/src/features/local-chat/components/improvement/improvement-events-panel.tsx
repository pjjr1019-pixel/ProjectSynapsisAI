import React from "react";
import type { ImprovementEvent } from "@contracts/improvement";
import { useImprovementEvents } from "../../hooks/useImprovementEvents";
import { OverlayRulesTab } from "./OverlayRulesTab";

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
  const [activeTab, setActiveTab] = React.useState<"events" | "rules">("events");
  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(null);  // Phase 5: Track expanded event
  
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
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("events")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              activeTab === "events"
                ? "bg-gray-700 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              activeTab === "rules"
                ? "bg-gray-700 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Overlay Rules
          </button>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === "events" && (
        <>
          {loading && <div className="text-gray-400 mb-2">Loading...</div>}

          {error && <div className="text-red-500 mb-2 text-xs">Error: {error}</div>}

          {events.length === 0 && !loading && (
            <div className="text-gray-400 italic">No events detected yet</div>
          )}

          <div className="space-y-2">
            {events.map((event: ImprovementEvent) => {
              // Phase 5: Extract decision details from payload
              const policyDecision = (event.payload as any)?.policyDecision;
              const decisionReason = (event.payload as any)?.decisionReason;
              const failedGate = (event.payload as any)?.failedGate;
              const policyEval = (event.payload as any)?.policyEvaluation;
              const memoryId = (event.payload as any)?.memoryId;
              const isEventExpanded = expandedEventId === event.id;
              
              return (
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
                  {/* Phase 5: Show status badge */}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                    event.status === "applied" ? "bg-green-600" :
                    event.status === "deferred" ? "bg-yellow-600" :
                    event.status === "rejected" ? "bg-red-600" :
                    "bg-gray-600"
                  }`}>
                    {event.status}
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

                {/* Phase 5: Expandable Decision Details */}
                {(policyDecision || decisionReason || failedGate || memoryId) && (
                  <>
                    <button
                      onClick={() => setExpandedEventId(isEventExpanded ? null : event.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold mt-1"
                    >
                      {isEventExpanded ? "▼" : "▶"} Policy Decision Details
                    </button>
                    {isEventExpanded && (
                      <div className="bg-gray-100 rounded p-2 space-y-1 border-l-2 border-blue-400">
                        {policyDecision && (
                          <div className="text-gray-700">
                            <span className="font-medium">Decision:</span>
                            <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold inline-block ${
                              policyDecision === "apply" ? "bg-green-200 text-green-800" :
                              policyDecision === "reject" ? "bg-red-200 text-red-800" :
                              policyDecision === "defer" ? "bg-yellow-200 text-yellow-800" :
                              "bg-gray-200 text-gray-800"
                            }`}>
                              {policyDecision.toUpperCase()}
                            </span>
                          </div>
                        )}
                        {policyEval?.category && (
                          <div className="text-gray-700">
                            <span className="font-medium">Category:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{policyEval.category}</span>
                          </div>
                        )}
                        {policyEval?.confidence !== undefined && (
                          <div className="text-gray-700">
                            <span className="font-medium">Confidence:</span> {(policyEval.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                        {decisionReason && (
                          <div className="text-gray-700">
                            <span className="font-medium">Reason:</span> {decisionReason}
                          </div>
                        )}
                        {failedGate && (
                          <div className="text-gray-700">
                            <span className="font-medium">Failed Gate:</span> <span className="bg-red-100 px-1.5 py-0.5 rounded">{failedGate}</span>
                          </div>
                        )}
                        {policyEval?.durabilityScore !== undefined && (
                          <div className="text-gray-700">
                            <span className="font-medium">Durability Score:</span> {(policyEval.durabilityScore * 100).toFixed(0)}%
                          </div>
                        )}
                        {memoryId && (
                          <div className="text-gray-700">
                            <span className="font-medium">Memory ID:</span> <code className="bg-gray-200 px-1 text-xs">{memoryId.substring(0, 12)}...</code>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              );
            })}
          </div>

          <div className="text-gray-400 text-xs mt-2 pt-2 border-t border-gray-200">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </>
      )}

      {/* Overlay Rules Tab */}
      {activeTab === "rules" && <OverlayRulesTab />}
    </div>
  );
};

export default ImprovementEventsPanel;
