import type { Conversation } from "@contracts";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Panel } from "../../../shared/components/Panel";
import { formatDateTime } from "../../../shared/utils/time";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onNewConversation: () => Promise<void>;
  onSelectConversation: (conversationId: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
}

export function ConversationList(props: ConversationListProps) {
  const {
    conversations,
    activeConversationId,
    query,
    onQueryChange,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation
  } = props;

  return (
    <Panel className="flex h-full flex-col gap-3">
      <Button onClick={() => void onNewConversation()}>New Chat</Button>
      <Input
        value={query}
        placeholder="Search conversations"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`rounded border p-2 ${
              conversation.id === activeConversationId
                ? "border-cyan-400/50 bg-cyan-500/10"
                : "border-slate-800 bg-slate-900/50"
            }`}
          >
            <button
              className="w-full text-left"
              onClick={() => void onSelectConversation(conversation.id)}
            >
              <p className="truncate text-sm text-slate-100">{conversation.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(conversation.updatedAt)}</p>
            </button>
            <Button
              className="mt-2 w-full"
              variant="ghost"
              onClick={() => void onDeleteConversation(conversation.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
