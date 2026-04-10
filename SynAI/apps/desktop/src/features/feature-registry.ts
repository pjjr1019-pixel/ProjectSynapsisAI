export interface FeatureFlagItem {
  id: string;
  label: string;
  status: "active" | "later";
}

export const featureRegistry: FeatureFlagItem[] = [
  { id: "local-chat", label: "Local Chat", status: "active" },
  { id: "memory", label: "Memory", status: "active" },
  { id: "retrieval", label: "Retrieval", status: "active" },
  { id: "actions", label: "Actions", status: "active" },
  { id: "approvals", label: "Approvals", status: "active" },
  { id: "workflows", label: "Workflows", status: "active" },
  { id: "knowledge", label: "Knowledge", status: "active" },
  { id: "plugins", label: "Plugins", status: "active" },
  { id: "improvements", label: "Improvements", status: "active" }
];
