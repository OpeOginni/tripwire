import { useEffect } from "react";
import { ChatThread } from "#/components/chat/chat-thread";
import { ChatComposer } from "#/components/chat/chat-composer";
import { useAIChat } from "#/components/chat/chat-context";
import Dither from "#/components/Dither";

interface AgentPanelProps {
	workflowId?: string;
}

export function AgentPanel({ workflowId }: AgentPanelProps) {
	const {
		messages,
		isLoading,
		error,
		isQuotaExhausted,
		sendMessage,
		respondToToolApproval,
		setWorkflowContext,
		newChat,
	} = useAIChat();

	useEffect(() => {
		if (workflowId) {
			setWorkflowContext({ workflowId });
		}
		return () => {
			setWorkflowContext(null);
		};
	}, [workflowId, setWorkflowContext]);

	return (
		<div className="flex flex-col h-full relative">
			<div
				className="pointer-events-none absolute inset-x-0 bottom-0 h-[350px] z-0"
				style={{
					maskImage: "linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.4) 80%, black 100%)",
					WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.4) 80%, black 100%)",
				}}
			>
				<Dither
					waveColor={[0.4627450980392157, 0.4627450980392157, 0.4627450980392157]}
					disableAnimation={false}
					enableMouseInteraction={false}
					mouseRadius={0.1}
					colorNum={4}
					pixelSize={2}
					waveAmplitude={0.25}
					waveFrequency={3}
					waveSpeed={0.1}
				/>
			</div>

			<div className="flex items-center justify-between px-4 py-3 border-b border-tw-border shrink-0 relative z-10">
				<span className="text-[13px] font-medium text-tw-text-secondary">Workflow Agent</span>
				<button
					type="button"
					onClick={newChat}
					className="flex items-center justify-center size-6 rounded-md hover:bg-tw-hover transition-colors"
					title="New chat"
				>
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
						<path
							d="M7 3v8M3 7h8"
							stroke="#9F9FA9"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-auto min-h-0 px-2 py-2 relative z-10">
				<ChatThread
					messages={messages}
					isLoading={isLoading}
					error={error}
					isQuotaExhausted={isQuotaExhausted}
					respondToToolApproval={respondToToolApproval}
				/>
			</div>

			<div className="shrink-0 border-t border-tw-border px-3 py-3 relative z-10">
				<ChatComposer
					disabled={isLoading || isQuotaExhausted}
					isLoading={isLoading}
					placeholder="Ask about this workflow..."
					onSend={sendMessage}
				/>
			</div>
		</div>
	);
}
