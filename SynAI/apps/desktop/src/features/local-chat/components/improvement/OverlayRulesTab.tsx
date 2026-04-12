import React, { useState } from "react";
import { useOverlayRules, type ReplyPolicyRule, type OverlayStats } from "../../hooks/useOverlayRules";

/**
 * Tab component for inspecting and managing overlay rules.
 * Displays rules in a list with enable/disable/delete actions.
 * Allows bulk reset with explicit confirmation.
 */
export const OverlayRulesTab: React.FC = () => {
  const { rules, stats, loading, error, refresh, disableRule, enableRule, deleteRule, resetAll } =
    useOverlayRules({
      autoRefreshMs: 10000,
      enabled: true
    });

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const handleToggleRule = async (ruleId: string, currentlyEnabled: boolean) => {
    setActionInProgress(true);
    try {
      if (currentlyEnabled) {
        await disableRule(ruleId);
      } else {
        await enableRule(ruleId);
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Delete this overlay rule?")) {
      return;
    }
    setActionInProgress(true);
    try {
      await deleteRule(ruleId);
      setSelectedRuleId(null);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResetAll = async () => {
    setActionInProgress(true);
    try {
      await resetAll();
      setShowResetConfirmation(false);
    } finally {
      setActionInProgress(false);
    }
  };

  const selectedRule = selectedRuleId ? rules.find((r) => r.id === selectedRuleId) : null;

  // Render error state (before empty state)
  if (error && rules.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p className="text-sm mb-2">Error loading overlay rules: {error}</p>
        <button
          onClick={refresh}
          className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render loading state
  if (loading && rules.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Loading overlay rules...</p>
      </div>
    );
  }

  // Render empty state
  if (rules.length === 0 && !loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm mb-2">No overlay rules yet</p>
        <p className="text-xs text-gray-400">Rules will appear when reply-policy overlays are created</p>
        {/* Show Clear All button (disabled) even when no rules exist */}
        <div className="border-t pt-3 mt-3">
          <button
            disabled
            className="w-full px-3 py-1.5 rounded text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear All Overlay Rules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Stats footer */}
      {stats && (
        <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
          <div className="flex justify-between">
            <span>Total rules: {stats.totalRules}</span>
            <span>Enabled: {stats.enabledRules}</span>
            <span>Applied: {stats.totalTimesApplied}x</span>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-2 border rounded cursor-pointer transition-colors ${
              selectedRuleId === rule.id
                ? "bg-blue-100 border-blue-400"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={() => setSelectedRuleId(rule.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{rule.id.slice(0, 8)}</span>
                  <span className="text-xs font-semibold text-gray-700">{rule.category}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded text-white ${
                      rule.risk === "low"
                        ? "bg-green-600"
                        : rule.risk === "medium"
                          ? "bg-yellow-600"
                          : "bg-red-600"
                    }`}
                  >
                    {rule.risk}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(rule.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-gray-600 truncate mt-1">
                  {rule.rewrittenFallback.slice(0, 60)}
                  {rule.rewrittenFallback.length > 60 ? "..." : ""}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Applied {rule.hitCount}x •{" "}
                  {rule.lastUsedAt
                    ? new Date(rule.lastUsedAt).toLocaleDateString()
                    : "Never"}
                </div>
              </div>

              {/* Toggle button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleRule(rule.id, rule.enabled);
                }}
                disabled={actionInProgress}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  rule.enabled
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {rule.enabled ? "✓" : "✗"}
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRule(rule.id);
                }}
                disabled={actionInProgress}
                className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 hover:bg-red-200 hover:text-red-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail drawer */}
      {selectedRule && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">Rule Details</span>
            <button
              onClick={() => setSelectedRuleId(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-2 space-y-1 text-xs">
            <div>
              <span className="font-semibold text-gray-700">ID:</span>
              <span className="ml-2 font-mono text-gray-600">{selectedRule.id}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Category:</span>
              <span className="ml-2 text-gray-600">{selectedRule.category}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Keywords:</span>
              <span className="ml-2 text-gray-600">
                {selectedRule.matchConditions.keywords?.join(", ") || "(none)"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Confidence:</span>
              <span className="ml-2 text-gray-600">{(selectedRule.confidence * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Risk:</span>
              <span className="ml-2 text-gray-600">{selectedRule.risk}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Hit Count:</span>
              <span className="ml-2 text-gray-600">{selectedRule.hitCount}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Enabled:</span>
              <span className="ml-2 text-gray-600">{selectedRule.enabled ? "Yes" : "No"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">
                {new Date(selectedRule.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Last Used:</span>
              <span className="ml-2 text-gray-600">
                {selectedRule.lastUsedAt
                  ? new Date(selectedRule.lastUsedAt).toLocaleDateString()
                  : "Never"}
              </span>
            </div>

            <div className="mt-3 pt-2 border-t space-y-1">
              <div>
                <span className="font-semibold text-gray-700">Rewritten Fallback:</span>
                <div className="mt-1 p-1.5 bg-white border border-gray-200 rounded text-gray-700 max-h-20 overflow-y-auto">
                  {selectedRule.rewrittenFallback}
                </div>
              </div>
            </div>

            {/* Disable/Delete buttons in detail drawer */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleToggleRule(selectedRule.id, selectedRule.enabled)}
                disabled={actionInProgress}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                  selectedRule.enabled
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {selectedRule.enabled ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() => handleDeleteRule(selectedRule.id)}
                disabled={actionInProgress}
                className="flex-1 px-2 py-1.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-red-200 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All button */}
      <div className="border-t pt-3 mt-3">
        <button
          onClick={() => setShowResetConfirmation(true)}
          disabled={actionInProgress || rules.length === 0}
          className="w-full px-3 py-1.5 rounded text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear All Overlay Rules
        </button>

        {showResetConfirmation && (
          <div className="mt-2 p-2 border border-red-300 rounded bg-red-50">
            <p className="text-xs text-red-900 mb-2">
              Delete all overlay rules? This cannot be undone. (Canonical rules remain unchanged.)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetAll}
                disabled={actionInProgress}
                className="flex-1 px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setShowResetConfirmation(false)}
                disabled={actionInProgress}
                className="flex-1 px-2 py-1 rounded text-xs font-semibold bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
