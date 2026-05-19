import type { Node } from "@xyflow/react";
import { Button } from "#/components/ui/button";
import { AgentPanel } from "./agent-panel";
import { ToolboxPanel } from "./toolbox-panel";
import { EditorPanel } from "./editor-panel";

type SidebarTab = "agent" | "toolbox" | "editor";

interface WorkflowSidebarProps {
	search: string;
	setSearch: (s: string) => void;
	selectedNodeId: string | null;
	nodes: Node[];
	onNodeDataChange: (nodeId: string, data: Record<string, unknown>) => void;
	workflowId?: string;
	activeTab: SidebarTab;
	onTabChange: (tab: SidebarTab) => void;
}

const tabs: { key: SidebarTab; label: string }[] = [
	{ key: "agent", label: "Agent" },
	{ key: "toolbox", label: "Toolbox" },
	{ key: "editor", label: "Editor" },
] as const;

export function WorkflowSidebar({
	search,
	setSearch,
	selectedNodeId,
	nodes,
	onNodeDataChange,
	workflowId,
	activeTab,
	onTabChange,
}: WorkflowSidebarProps) {
	return (
		<div className="w-[380px] shrink-0 tw-inset flex flex-col m-2 mr-0">
			<div className="px-3 pt-3 pb-2 shrink-0">
				<div className="bg-tw-card rounded-[10px] p-1 flex items-center gap-1">
					{tabs.map(({ key, label }) => (
						<Button variant="ghost"
							key={key}
							type="button"
							onClick={() => onTabChange(key)}
							className={`flex-1 flex items-center justify-center h-7 px-2.5 rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer ${
								activeTab === key
									? "bg-[#FAFAFA1A] text-[#EEEEEE]"
									: "text-[#9F9FA9] hover:text-[#EEEEEE]"
							}`}
						>
							{label}
						</Button>
					))}
				</div>
			</div>

			<div className="flex-1 min-h-0 relative">
				<div className={activeTab === "agent" ? "flex flex-col h-full" : "hidden"}>
					<AgentPanel workflowId={workflowId} />
				</div>
				<div className={activeTab === "toolbox" ? "flex flex-col h-full" : "hidden"}>
					<ToolboxPanel search={search} setSearch={setSearch} />
				</div>
				<div className={activeTab === "editor" ? "flex flex-col h-full" : "hidden"}>
					<EditorPanel
						selectedNodeId={selectedNodeId}
						nodes={nodes}
						onNodeDataChange={onNodeDataChange}
					/>
				</div>
			</div>
		</div>
	);
}

export type { SidebarTab };
