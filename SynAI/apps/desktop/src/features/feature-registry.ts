export interface FeatureFlagItem {
  id: string;
  label: string;
  status: "active" | "later";
}

export const featureRegistry: FeatureFlagItem[] = [
  { id: "local-chat", label: "Local Chat", status: "active" },
  { id: "memory", label: "Memory", status: "active" },
  { id: "retrieval", label: "Retrieval", status: "active" },
  { id: "actions", label: "Actions", status: "later" },
  { id: "approvals", label: "Approvals", status: "later" },
  { id: "knowledge", label: "Knowledge", status: "later" }
];
