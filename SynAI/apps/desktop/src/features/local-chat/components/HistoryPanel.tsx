import type { Conversation } from "@contracts";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Card } from "../../../shared/components/Card";
import type { ConversationTurn } from "../types/localChat.types";
import { TurnPreview } from "./TurnPreview";

interface HistoryPanelProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewConversation: () => Promise<void>;
  onSelectConversation: (conversationId: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onOpenChat: () => void;
  turns: ConversationTurn[];
  activeTurnIndex: number | null;
  onSelectTurnIndex: (index: number) => void;
  onResetTurn: () => void;
  query: string;
  onQueryChange: (value: string) => void;
}

export function HistoryPanel({
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onOpenChat,
  turns,
  activeTurnIndex,
  onSelectTurnIndex,
  onResetTurn,
  query,
  onQueryChange
}: HistoryPanelProps) {
  const currentIndex = turns.length === 0 ? -1 : Math.min(activeTurnIndex ?? turns.length - 1, turns.length - 1);
  const currentTurn = currentIndex >= 0 ? turns[currentIndex] : null;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex >= 0 && currentIndex < turns.length - 1;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = normalizedQuery
    ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(normalizedQuery))
    : conversations;
  const selectedConversation =
    activeConversationId === null
      ? null
      : conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const selectConversations =
    selectedConversation && !filteredConversations.some((conversation) => conversation.id === selectedConversation.id)
      ? [selectedConversation, ...filteredConversations]
      : filteredConversations;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <header className="border-b border-slate-800 px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">History</h2>
            <p className="text-[9px] text-slate-400">Browse conversations and turns without scrolling.</p>
          </div>
          <Button className="px-2 py-1 text-[10px]" variant="ghost" onClick={() => void onOpenChat()}>
            Back to Chat
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
        <Card className="space-y-2 p-1.5">
          <label className="block space-y-1">
            <span className="text-[9px] text-slate-300">Find conversation</span>
            <Input
              value={query}
              placeholder="Type to filter"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[9px] text-slate-300">Conversation</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
              value={activeConversationId ?? ""}
              disabled={selectConversations.length === 0}
              onChange={(event) => {
                if (event.target.value) {
                  void onSelectConversation(event.target.value);
                }
              }}
            >
              {selectConversations.length === 0 ? <option value="">No conversations</option> : null}
              {selectConversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {conversation.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <Button className="py-1 text-[10px]" variant="ghost" onClick={() => void onNewConversation()}>
              New Chat
            </Button>
            <Button
              className="py-1 text-[10px]"
              variant="ghost"
              disabled={!activeConversationId}
              onClick={() => void (activeConversationId ? onDeleteConversation(activeConversationId) : undefined)}
            >
              Delete
            </Button>
            <Button className="py-1 text-[10px]" variant="ghost" onClick={onResetTurn} disabled={turns.length === 0}>
              Latest
            </Button>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-100">Turn Browser</h3>
              <p className="text-[9px] text-slate-500">
                {turns.length === 0 ? "No turns yet." : `Turn ${currentIndex + 1} of ${turns.length}`}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                className="px-2 py-1 text-[10px]"
                variant="ghost"
                disabled={!canGoBack}
                onClick={() => onSelectTurnIndex(Math.max(0, currentIndex - 1))}
              >
                Prev
              </Button>
              <Button
                className="px-2 py-1 text-[10px]"
                variant="ghost"
                disabled={!canGoForward}
                onClick={() => onSelectTurnIndex(Math.min(turns.length - 1, currentIndex + 1))}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <TurnPreview turn={currentTurn} label="Selected turn" />
          </div>
        </Card>
      </div>
    </section>
  );
}
