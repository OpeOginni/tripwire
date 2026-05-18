import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { onWorkflowMutation } from "#/lib/workflow-events";
import { buildChangeSummary, type EditorSnapshot } from "#/lib/pending-changes";
import { PendingChangesToolbar } from "#/components/automations/pending-changes-toolbar";
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	addEdge,
	useNodesState,
	useEdgesState,
	type Connection,
	type Edge,
	type Node,
	type ReactFlowInstance,
	BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "#/integrations/trpc/react";
import {
	nodeTypes,
	nodeColors,
	triggerLabels,
	ruleLabels,
	actionLabels,
} from "./node-types";
import {
	simulateWorkflow,
	type SimMode,
	type SimNodeResult,
	type SimUserData,
} from "#/lib/graph-evaluator";
import { WorkflowSidebar, type SidebarTab } from "./workflow-sidebar";
import { toastManager } from "#/components/ui/toast";

interface WorkflowEditorProps {
	initialNodes?: Node[];
	initialEdges?: Edge[];
	onSave?: (nodes: Node[], edges: Edge[]) => void;
	isSaving?: boolean;
	saveLabel?: string;
	repoId?: string;
	workflowId?: string;
	onRemoteUpdate?: () => void;
}

const getId = () => `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function WorkflowEditor({ initialNodes = [], initialEdges = [], onSave, isSaving, saveLabel, repoId, workflowId, onRemoteUpdate }: WorkflowEditorProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const [search, setSearch] = useState("");
	const [showSim, setShowSim] = useState(false);
	const [simResults, setSimResults] = useState<SimNodeResult[] | null>(null);
	const [simStep, setSimStep] = useState(0);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [sidebarTab, setSidebarTab] = useState<SidebarTab>("toolbox");
	const reactFlowWrapper = useRef<HTMLDivElement>(null);
	const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
	const initialSnapshot = useRef(JSON.stringify({ n: initialNodes.map((n) => ({ id: n.id, type: n.type, data: n.data })), e: initialEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })) }));

	const [pendingChangeSummary, setPendingChangeSummary] = useState<string | null>(null);
	const preChangeSnapshot = useRef<EditorSnapshot | null>(null);

	const isDirty = JSON.stringify({ n: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })), e: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })) }) !== initialSnapshot.current;

	const nodesRef = useRef(nodes);
	nodesRef.current = nodes;
	const edgesRef = useRef(edges);
	edgesRef.current = edges;

	useEffect(() => {
		if (!workflowId) return;
		return onWorkflowMutation((mutatedId) => {
			if (mutatedId !== workflowId) return;
			preChangeSnapshot.current = {
				nodes: nodesRef.current.map((n) => ({ ...n })),
				edges: edgesRef.current.map((e) => ({ ...e })),
			};
			queryClient.fetchQuery(
				trpc.workflows.get.queryOptions({ id: workflowId }),
			).then((wf) => {
				if (!wf) return;
				const def = wf.definition as { nodes: Node[]; edges: Edge[] };
				const before: EditorSnapshot = preChangeSnapshot.current ?? {
					nodes: nodesRef.current,
					edges: edgesRef.current,
				};
				const after: EditorSnapshot = { nodes: def.nodes, edges: def.edges };
				const summary = buildChangeSummary(before, after);
				setNodes(def.nodes);
				setEdges(def.edges);
				setPendingChangeSummary(summary);
			}).catch(() => {
				onRemoteUpdate?.();
			});
		});
	}, [workflowId, onRemoteUpdate, trpc, queryClient, setNodes, setEdges]);

	const handleAcceptChanges = () => {
		setPendingChangeSummary(null);
		preChangeSnapshot.current = null;
		initialSnapshot.current = JSON.stringify({
			n: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
			e: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
		});
	};

	const handleRevertChanges = () => {
		if (preChangeSnapshot.current) {
			setNodes(preChangeSnapshot.current.nodes);
			setEdges(preChangeSnapshot.current.edges);
		}
		setPendingChangeSummary(null);
		preChangeSnapshot.current = null;
	};

	const handleNodeDataChange = useCallback((nodeId: string, data: Record<string, unknown>) => {
		setNodes((nds) => nds.map((n) => n.id !== nodeId ? n : { ...n, data }));
	}, [setNodes]);

	const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
		setSelectedNodeId(node.id);
		setSidebarTab("editor");
	}, []);

	// No-op: keep selectedNodeId so the editor panel stays populated.
	// Selection clears when the user clicks a different node.
	const onPaneClick = () => {};

	const visibleSteps = simResults?.slice(0, simStep) ?? [];
	const displayNodes = useMemo(() => {
		if (!simResults || visibleSteps.length === 0) return nodes;
		const resultMap = new Map(visibleSteps.map((r) => [r.nodeId, r]));
		const triggerIds = new Set(nodes.filter((n) => n.type === "trigger").map((n) => n.id));
		return nodes.map((n) => {
			const r = resultMap.get(n.id);
			const isTrigger = triggerIds.has(n.id) && simStep > 0;
			if (!r && !isTrigger) return n;
			const status = r?.status ?? "executed";
			const isLatest = visibleSteps.length > 0 && visibleSteps[visibleSteps.length - 1]?.nodeId === n.id;
			const glowColor =
				status === "pass" ? (isLatest ? "0 0 0 2px #67E19F" : "0 0 0 2px #67E19F66") :
				status === "fail" ? (isLatest ? "0 0 0 2px #F56D5D" : "0 0 0 2px #F56D5D66") :
				status === "executed" ? (isLatest ? "0 0 0 2px #34A6FF" : "0 0 0 2px #34A6FF66") :
				undefined;
			return glowColor ? { ...n, style: { ...n.style, boxShadow: glowColor, borderRadius: "12px" } } : n;
		});
	}, [nodes, simResults, visibleSteps, simStep]);

	const displayEdges = useMemo(() => {
		if (!simResults || visibleSteps.length === 0) return edges;
		const activeEdgeMap = new Map<string, SimNodeResult>();
		for (const step of visibleSteps) {
			if (step.edgeId) activeEdgeMap.set(step.edgeId, step);
		}
		const latestEdgeId = visibleSteps.length > 0 ? visibleSteps[visibleSteps.length - 1]?.edgeId : null;
		return edges.map((e) => {
			const step = activeEdgeMap.get(e.id);
			if (!step) return e;
			const isLatest = e.id === latestEdgeId;
			const color =
				step.status === "pass" ? "#67E19F" :
				step.status === "fail" ? "#F56D5D" :
				step.status === "executed" ? "#34A6FF" :
				"#9F9FA9";
			return {
				...e,
				animated: true,
				style: {
					stroke: color,
					strokeWidth: isLatest ? 2.5 : 2,
					opacity: isLatest ? 1 : 0.6,
					transition: "stroke 0.3s, stroke-width 0.3s, opacity 0.3s",
				},
			};
		});
	}, [edges, simResults, visibleSteps]);

	const onConnect = useCallback(
		(params: Connection) => {
			setEdges((eds) =>
				addEdge({ ...params, animated: true, style: { stroke: "#27272A", strokeWidth: 1.5 } }, eds),
			);
		},
		[setEdges],
	);

	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const type = e.dataTransfer.getData("application/reactflow-type");
			const dataStr = e.dataTransfer.getData("application/reactflow-data");
			if (!type || !rfInstance || !reactFlowWrapper.current) return;

			if (type === "trigger" && nodesRef.current.some((n) => n.type === "trigger")) {
				toastManager.add({ type: "error", title: "Only one trigger per workflow" });
				return;
			}

			const bounds = reactFlowWrapper.current.getBoundingClientRect();
			const position = rfInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
			const newId = getId();
			setNodes((nds) => [...nds, { id: newId, type, position, data: dataStr ? JSON.parse(dataStr) : {} }]);
			setSelectedNodeId(newId);
		},
		[rfInstance, setNodes],
	);

	const handleSave = () => {
		if (onSave) onSave(nodes, edges);
		initialSnapshot.current = JSON.stringify({ n: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })), e: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })) });
	};

	return (
		<div className="flex h-full w-full">
			<WorkflowSidebar
				search={search}
				setSearch={setSearch}
				selectedNodeId={selectedNodeId}
				nodes={nodes}
				onNodeDataChange={handleNodeDataChange}
				workflowId={workflowId}
				activeTab={sidebarTab}
				onTabChange={setSidebarTab}
			/>
			<div className="flex-1 relative" ref={reactFlowWrapper}>
				<ReactFlow
					nodes={displayNodes}
					edges={displayEdges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onInit={setRfInstance}
					onDragOver={onDragOver}
					onDrop={onDrop}
					onNodeClick={onNodeClick}
					onPaneClick={onPaneClick}
					nodeTypes={nodeTypes}
					fitView
					proOptions={{ hideAttribution: true }}
					defaultEdgeOptions={{ animated: true, style: { stroke: "#27272A", strokeWidth: 1.5 } }}
					className="!bg-tw-bg"
				>
					<Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#FFFFFF08" />
					<Controls
						className="!bg-tw-card !border-tw-border !rounded-lg [&>button]:!bg-tw-card [&>button]:!border-tw-border [&>button]:!text-tw-text-muted [&>button:hover]:!bg-tw-hover"
					/>
					<MiniMap
						nodeColor={(n) => {
							if (simResults) {
								const r = simResults.find((sr) => sr.nodeId === n.id);
								if (r?.status === "pass") return "#67E19F";
								if (r?.status === "fail") return "#F56D5D";
								if (r?.status === "executed") return "#34A6FF";
							}
							return nodeColors[n.type as keyof typeof nodeColors] ?? "#9F9FA9";
						}}
						maskColor="#0D0D0F99"
						className="!bg-tw-surface !border-tw-border !rounded-lg"
					/>
				</ReactFlow>

				<div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
					<button
						type="button"
						onClick={() => { setShowSim(!showSim); if (showSim) { setSimResults(null); setSimStep(0); } }}
						className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
							showSim
								? "bg-tw-card text-[#FAFAFA]"
								: "text-tw-text-muted hover:bg-tw-hover hover:text-tw-text-primary"
						}`}
					>
						<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
							<path d="M3 2l10 6-10 6V2Z" />
						</svg>
						Test
					</button>
					{onSave && (
						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving}
							className={`flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[13px] font-medium transition-colors disabled:opacity-60 ${
								isDirty || saveLabel
									? "bg-tw-accent text-white hover:opacity-90"
									: "bg-[#363639] hover:bg-[#404044] text-tw-text-primary"
							}`}
						>
							{isSaving ? (
								<div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
							) : null}
							{saveLabel ?? "Save"}
						</button>
					)}
				</div>

				{pendingChangeSummary && (
					<PendingChangesToolbar
						summary={pendingChangeSummary}
						onAccept={handleAcceptChanges}
						onCancel={handleRevertChanges}
					/>
				)}
			</div>
			{showSim && (
				<SimulationPanel
					nodes={nodes}
					edges={edges}
					simResults={simResults}
					setSimResults={setSimResults}
					simStep={simStep}
					setSimStep={setSimStep}
					repoId={repoId}
				/>
			)}
		</div>
	);
}

function SimulationPanel({
	nodes,
	edges,
	simResults,
	setSimResults,
	simStep,
	setSimStep,
	repoId,
}: {
	nodes: Node[];
	edges: Edge[];
	simResults: SimNodeResult[] | null;
	setSimResults: (r: SimNodeResult[] | null) => void;
	simStep: number;
	setSimStep: (s: number) => void;
	repoId?: string;
}) {
	const trpc = useTRPC();
	const [mode, setMode] = useState<SimMode>("pass");
	const [username, setUsername] = useState("");
	const [userData, setUserData] = useState<{ user: { login: string; avatarUrl: string; name: string | null }; data: SimUserData } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isAnimating, setIsAnimating] = useState(false);

	const fetchUser = useMutation(trpc.workflows.simulate.mutationOptions());

	const suggestionsQuery = useQuery(
		trpc.events.activeUsers.queryOptions(
			{ repoId: repoId ?? "", days: 90 },
			{ enabled: !!repoId && mode === "user", staleTime: 60_000 },
		),
	);
	const suggestions = (suggestionsQuery.data ?? []).slice(0, 8);

	useEffect(() => {
		if (!isAnimating || !simResults) return;
		if (simStep >= simResults.length) { setIsAnimating(false); return; }
		const timer = setTimeout(() => setSimStep(simStep + 1), 400);
		return () => clearTimeout(timer);
	}, [isAnimating, simStep, simResults, setSimStep]);

	const runSim = async () => {
		setError(null);
		setSimStep(0);
		let results: SimNodeResult[];
		if (mode === "user") {
			if (!username.trim()) { setError("Enter a GitHub username"); return; }
			const result = await fetchUser.mutateAsync({ username: username.trim(), repoId });
			if (!result.found) { setError(`User "${username}" not found`); return; }
			setUserData({ user: result.user, data: result.data });
			results = simulateWorkflow(nodes, edges, "user", result.data, actionLabels);
		} else {
			setUserData(null);
			const dummy: SimUserData = { accountAgeDays: 0, followers: 0, following: 0, publicRepos: 0, publicNonForkRepos: 0, publicGists: 0, hasProfileReadme: false, mergedPrs: 0, score: 0 };
			results = simulateWorkflow(nodes, edges, mode, dummy, actionLabels);
		}
		setSimResults(results);
		setSimStep(0);
		setIsAnimating(true);
	};

	const clear = () => { setSimResults(null); setUserData(null); setError(null); setSimStep(0); setIsAnimating(false); };

	const visibleResults = simResults?.slice(0, simStep) ?? [];
	const passCount = visibleResults.filter((r) => r.status === "pass").length;
	const failCount = visibleResults.filter((r) => r.status === "fail").length;
	const execCount = visibleResults.filter((r) => r.status === "executed").length;

	return (
		<div className="w-[280px] shrink-0 border-l border-tw-border bg-tw-surface overflow-auto flex flex-col">
			<div className="px-3 pt-3 pb-2">
				<div className="text-[11px] uppercase tracking-[0.08em] text-tw-text-tertiary font-medium mb-2.5">
					Simulate
				</div>

				<div className="bg-tw-card rounded-[10px] p-1 flex items-center gap-1 mb-2.5">
					{([
						["pass", "All Pass"] as const,
						["fail", "All Fail"] as const,
						["user", "Real User"] as const,
					]).map(([m, label]) => (
						<button
							key={m}
							type="button"
							onClick={() => { setMode(m); clear(); }}
							className={`flex-1 flex items-center justify-center h-7 px-2.5 rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer ${
								mode === m
									? "bg-tw-surface text-tw-text-primary"
									: "text-tw-text-muted hover:text-tw-text-primary"
							}`}
						>
							{label}
						</button>
					))}
				</div>

				{mode === "user" && (
					<>
						<div className="flex items-center gap-2 h-8 rounded-[10px] bg-tw-card px-2.5 mb-2">
							<svg width="13" height="13" viewBox="0 0 16 16" fill="#6E6E6E">
								<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5 7a5 5 0 0 0-10 0h10Z" />
							</svg>
							<input
								type="text"
								placeholder="GitHub username..."
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && runSim()}
								className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-[#6E6E6E]"
							/>
						</div>
						{suggestions.length > 0 && !username && (
							<div className="flex flex-col gap-0.5 mb-2.5">
								<div className="text-[10px] text-tw-text-tertiary px-1 mb-0.5">Recent contributors</div>
								{suggestions.map((s) => (
									<button
										key={s.username}
										type="button"
										onClick={() => setUsername(s.username ?? "")}
										className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-tw-card hover:bg-tw-hover transition-colors text-left"
									>
										<img
											src={`https://github.com/${s.username}.png?size=32`}
											alt=""
											className="size-5 rounded-full"
										/>
										<span className="text-[12px] text-tw-text-secondary truncate">{s.username}</span>
										<span className="text-[10px] text-tw-text-tertiary ml-auto tabular-nums">{s.count}</span>
									</button>
								))}
							</div>
						)}
					</>
				)}

				{error && <p className="text-[11px] text-tw-error mb-2">{error}</p>}

				<button
					type="button"
					onClick={runSim}
					disabled={fetchUser.isPending}
					className="w-full flex items-center justify-center gap-1.5 h-8 rounded-[10px] bg-[#363639] hover:bg-[#404044] text-[13px] font-medium text-tw-text-primary transition-colors disabled:opacity-50"
				>
					{fetchUser.isPending ? "Fetching..." : "Run"}
				</button>
			</div>

			{userData && (
				<div className="mx-2 mb-2 rounded-[10px] bg-tw-inner p-2.5">
					<div className="flex items-center gap-2.5 mb-2">
						<img src={userData.user.avatarUrl} alt="" className="size-8 rounded-full" />
						<div className="min-w-0 flex-1">
							<p className="text-[13px] font-medium text-tw-text-primary truncate">
								{userData.user.name ?? userData.user.login}
							</p>
							<p className="text-[11px] text-tw-text-tertiary">@{userData.user.login}</p>
						</div>
						<div
							className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium tabular-nums ${
								userData.data.score >= 70 ? "text-tw-success bg-tw-success/10"
								: userData.data.score >= 40 ? "text-tw-warning bg-tw-warning/10"
								: "text-tw-error bg-tw-error/10"
							}`}
						>
							{userData.data.score}/100
						</div>
					</div>
					<div className="grid grid-cols-3 gap-1.5">
						{[
							["Age", `${userData.data.accountAgeDays}d`],
							["Repos", String(userData.data.publicNonForkRepos)],
							["Followers", String(userData.data.followers)],
						].map(([label, val]) => (
							<div key={label} className="rounded-md bg-tw-card px-2 py-1.5 text-center">
								<div className="text-[12px] font-medium text-tw-text-primary tabular-nums">{val}</div>
								<div className="text-[10px] text-tw-text-tertiary">{label}</div>
							</div>
						))}
					</div>
				</div>
			)}

			{simResults && (
				<div className="flex-1 overflow-auto">
					<div className="flex items-center gap-3 px-3 py-2 border-t border-tw-border">
						<span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
							<span className="w-1.5 h-1.5 rounded-full bg-tw-success" />
							{passCount} pass
						</span>
						<span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
							<span className="w-1.5 h-1.5 rounded-full bg-tw-error" />
							{failCount} fail
						</span>
						<span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-tw-text-muted">
							<span className="w-1.5 h-1.5 rounded-full bg-tw-accent" />
							{execCount} exec
						</span>
						{isAnimating && (
							<span className="ml-auto text-[10px] text-tw-text-tertiary tabular-nums">
								{simStep}/{simResults.length}
							</span>
						)}
					</div>
					<div className="px-2 pb-2 flex flex-col gap-1">
						{visibleResults.map((r, i) => {
							const node = nodes.find((n) => n.id === r.nodeId);
							const label =
								node?.type === "trigger" ? triggerLabels[(node.data.trigger as string)] ?? "Trigger" :
								node?.type === "rule" ? ruleLabels[(node.data.rule as string)] ?? "Rule" :
								node?.type === "action" ? actionLabels[(node.data.action as string)] ?? "Action" :
								node?.type === "logic" ? (node.data.gate as string) :
								node?.type === "condition" ? "Condition" :
								node?.type ?? "Node";
							const dotClass =
								r.status === "pass" ? "bg-tw-success" :
								r.status === "fail" ? "bg-tw-error" :
								r.status === "executed" ? "bg-tw-accent" :
								"bg-tw-text-muted";
							const isLatest = i === visibleResults.length - 1 && isAnimating;
							return (
								<div
									key={r.nodeId}
									className={`rounded-[10px] px-2.5 py-2 flex items-start gap-2.5 transition-colors duration-200 ${
										isLatest ? "bg-[#FAFAFA1A]" : "bg-tw-inner"
									}`}
								>
									<span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
									<div className="min-w-0">
										<p className="text-[13px] text-tw-text-primary leading-tight">{label}</p>
										{r.detail && (
											<p className="text-[11px] text-tw-text-tertiary leading-relaxed mt-0.5">{r.detail}</p>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
