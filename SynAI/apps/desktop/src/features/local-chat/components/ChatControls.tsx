import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import type { HealthCheckState } from "../types/localChat.types";

interface ChatControlsProps {
  loading: boolean;
  healthCheckState: HealthCheckState;
  healthCheckMessage: string | null;
  onRunHealthCheck: () => Promise<void>;
  onNewConversation: () => Promise<void>;
  onClearChat: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onRefreshMemory: () => Promise<void>;
  onCopyResponse: () => Promise<void>;
}

export function ChatControls(props: ChatControlsProps) {
  const feedbackClassName =
    props.healthCheckState === "success"
      ? "text-emerald-300"
      : props.healthCheckState === "failure"
        ? "text-rose-300"
        : "text-amber-300";

  return (
    <Card className="space-y-2 p-2">
      <h3 className="text-sm font-semibold text-slate-100">Chat Controls</h3>
      <Button
        className="w-full py-1"
        variant="ghost"
        disabled={props.loading}
        onClick={() => void props.onRunHealthCheck()}
      >
        {props.healthCheckState === "running" ? "Running Health Check..." : "Run Health Check"}
      </Button>
      <p aria-live="polite" className={`text-[10px] ${props.healthCheckMessage ? feedbackClassName : "text-slate-500"}`}>
        {props.healthCheckMessage ?? "Health check updates appear here."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button className="py-1" variant="ghost" disabled={props.loading} onClick={() => void props.onNewConversation()}>
          New Conversation
        </Button>
        <Button className="py-1" variant="ghost" disabled={props.loading} onClick={() => void props.onClearChat()}>
          Clear Chat
        </Button>
        <Button className="py-1" variant="ghost" disabled={props.loading} onClick={() => void props.onRegenerate()}>
          Regenerate Reply
        </Button>
        <Button className="py-1" variant="ghost" disabled={props.loading} onClick={() => void props.onRefreshMemory()}>
          Refresh Memory
        </Button>
        <Button className="col-span-2 py-1" variant="ghost" disabled={props.loading} onClick={() => void props.onCopyResponse()}>
          Copy Response
        </Button>
      </div>
    </Card>
  );
}
