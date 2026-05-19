import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "#/lib/workspace-context";
import { useTRPC } from "#/integrations/trpc/react";
import { WorkflowEditor } from "#/components/automations/workflow-editor";
import { templates } from "#/components/automations/templates";
import type { Node, Edge } from "@xyflow/react";
import { ChevronLeftStrokeIcon14 } from "#/components/icons/app-chrome-icons";

export const Route = createFileRoute("/_app/$orgHandle/automations/preview")({
	component: TemplatePreviewPage,
	validateSearch: (search: Record<string, unknown>) => ({
		template: (search.template as string) ?? "",
	}),
});

function TemplatePreviewPage() {
	const { orgHandle } = Route.useParams();
	const { template: templateId } = Route.useSearch();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { repo } = useWorkspace();

	const template = templates.find((t) => t.id === templateId);
	const createWf = useMutation(trpc.workflows.create.mutationOptions());

	const handleSaveToWorkflows = (nodes: Node[], edges: Edge[]) => {
		if (!repo?.id || !template) return;
		createWf.mutate(
			{
				repoId: repo.id,
				name: template.name,
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
				onSuccess: (wf) => {
					queryClient.invalidateQueries({ queryKey: trpc.workflows.list.queryKey({ repoId: repo!.id }) });
					navigate({ to: `/${orgHandle}/automations/${wf.id}` });
				},
			},
		);
	};

	if (!template) {
		return (
			<div className="flex items-center justify-center h-full">
				<span className="text-tw-text-muted text-sm">Template not found.</span>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center gap-3 px-4 py-3 border-b border-tw-border shrink-0">
				<Button variant="ghost"
					type="button"
					onClick={() => navigate({ to: `/${orgHandle}/automations` })}
					className="flex items-center justify-center size-7 rounded-lg hover:bg-tw-hover transition-colors"
				>
					<ChevronLeftStrokeIcon14 className="text-[#9F9FA9]" />
				</Button>
				<div className="flex items-center gap-2.5 min-w-0 flex-1">
					<div className="flex flex-col min-w-0">
						<span className="text-[14px] font-medium text-tw-text-primary truncate">{template.name}</span>
						<span className="text-[11px] text-tw-text-muted truncate">{template.description}</span>
					</div>
				</div>
				<span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-tw-warning/10 text-tw-warning">
					Preview
				</span>
			</div>
			<div className="flex-1 min-h-0">
				<WorkflowEditor
					initialNodes={template.nodes}
					initialEdges={template.edges}
					onSave={handleSaveToWorkflows}
					saveLabel="Save to Workflows"
					repoId={repo?.id}
				/>
			</div>
		</div>
	);
}
