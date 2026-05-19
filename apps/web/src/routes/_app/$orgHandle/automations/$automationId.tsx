import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { useWorkspace } from "#/lib/workspace-context";
import { useTRPC } from "#/integrations/trpc/react";
import { WorkflowEditor } from "#/components/automations/workflow-editor";
import type { Node, Edge } from "@xyflow/react";
import { ChevronLeftStrokeIcon14 } from "#/components/icons/app-chrome-icons";

export const Route = createFileRoute("/_app/$orgHandle/automations/$automationId")({
	component: AutomationEditorPage,
});

function AutomationEditorPage() {
	const { automationId, orgHandle } = Route.useParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { repo } = useWorkspace();

	const wfQuery = useQuery(
		trpc.workflows.get.queryOptions(
			{ id: automationId },
			{ enabled: !!automationId },
		),
	);

	const updateWf = useMutation(trpc.workflows.update.mutationOptions());

	const [editingName, setEditingName] = useState(false);
	const [nameDraft, setNameDraft] = useState("");
	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editingName) {
			nameInputRef.current?.focus();
			nameInputRef.current?.select();
		}
	}, [editingName]);

	const commitName = () => {
		const trimmed = nameDraft.trim();
		if (trimmed && trimmed !== wfQuery.data?.name) {
			updateWf.mutate({ id: automationId, name: trimmed }, {
				onSuccess: () => {
					if (repo?.id) {
						queryClient.invalidateQueries({ queryKey: trpc.workflows.list.queryKey({ repoId: repo.id }) });
					}
					queryClient.invalidateQueries({ queryKey: trpc.workflows.get.queryKey({ id: automationId }) });
				},
			});
		}
		setEditingName(false);
	};

	const handleSave = (nodes: Node[], edges: Edge[]) => {
		updateWf.mutate(
			{
				id: automationId,
				definition: {
					nodes: nodes.map((n) => ({
						id: n.id,
						type: n.type as string,
						position: n.position,
						data: n.data as Record<string, unknown>,
					})),
					edges: edges.map((e) => ({
						id: e.id,
						source: e.source,
						target: e.target,
						sourceHandle: e.sourceHandle,
						targetHandle: e.targetHandle,
						label: typeof e.label === "string" ? e.label : undefined,
						animated: e.animated,
					})),
				},
			},
			{
				onSuccess: () => {
					if (repo?.id) {
						queryClient.invalidateQueries({ queryKey: trpc.workflows.list.queryKey({ repoId: repo.id }) });
					}
				},
			},
		);
	};

	if (wfQuery.isPending) {
		return (
			<div className="flex items-center justify-center h-full">
				<span className="text-tw-text-muted text-sm">Loading...</span>
			</div>
		);
	}

	if (!wfQuery.data) {
		return (
			<div className="flex items-center justify-center h-full">
				<span className="text-tw-text-muted text-sm">Workflow not found.</span>
			</div>
		);
	}

	const wf = wfQuery.data;
	const def = wf.definition as { nodes: Node[]; edges: Edge[] };

	const handleRemoteUpdate = () => {
		wfQuery.refetch();
	};

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center gap-3 px-4 py-3 border-b border-tw-border shrink-0">
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => navigate({ to: `/${orgHandle}/automations` })}
				>
					<ChevronLeftStrokeIcon14 className="text-[#9F9FA9]" />
				</Button>
				<div className="flex flex-col min-w-0">
					{editingName ? (
						<input
							ref={nameInputRef}
							type="text"
							value={nameDraft}
							onChange={(e) => setNameDraft(e.target.value)}
							onBlur={commitName}
							onKeyDown={(e) => {
								if (e.key === "Enter") { e.preventDefault(); commitName(); }
								if (e.key === "Escape") { e.preventDefault(); setEditingName(false); }
							}}
							className="text-[14px] font-medium text-tw-text-primary bg-transparent border-b border-tw-accent outline-none px-0 py-0"
						/>
					) : (
						<Button
							variant="ghost"
							size="xs"
							onClick={() => { setNameDraft(wf.name); setEditingName(true); }}
							className="text-[14px] font-medium text-tw-text-primary truncate text-left hover:text-tw-accent cursor-text h-auto p-0"
						>
							{wf.name}
						</Button>
					)}
					{wf.description && (
						<span className="text-[11px] text-tw-text-muted truncate">{wf.description}</span>
					)}
				</div>
				<div className="ml-auto flex items-center gap-2">
					<span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${wf.enabled ? "bg-tw-success/10 text-tw-success" : "bg-[#FFFFFF08] text-tw-text-muted"}`}>
						{wf.enabled ? "Active" : "Draft"}
					</span>
				</div>
			</div>
			<div className="flex-1 min-h-0">
				<WorkflowEditor
					key={wfQuery.dataUpdatedAt}
					initialNodes={def.nodes as Node[]}
					initialEdges={def.edges as Edge[]}
					onSave={handleSave}
					isSaving={updateWf.isPending}
					repoId={repo?.id}
					workflowId={automationId}
					onRemoteUpdate={handleRemoteUpdate}
				/>
			</div>
		</div>
	);
}
