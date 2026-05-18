import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, useStoreApi, type NodeProps } from "@xyflow/react";
import { NODE_STYLE_MAP, HANDLE_COLORS, getNodeStyle } from "#/lib/node-styles";
import { formatScheduleSublabel } from "#/lib/schedule-format";
import {
	TriggerIcon,
	ScheduleIcon,
	RuleIcon,
	ConditionIcon,
	LogicGateIcon,
	ActionIcon,
	DelayIcon,
	TransformIcon,
} from "#/components/icons/node-icons";

function NodeShell({
	children,
	type,
	icon,
	label,
	sublabel,
	selected,
}: {
	children?: React.ReactNode;
	type: string;
	icon: React.ReactNode;
	label: string;
	sublabel?: string;
	selected?: boolean;
}) {
	const style = getNodeStyle(type);
	return (
		<div
			className={`rounded-xl bg-tw-card min-w-[200px] max-w-[260px] transition-shadow ${
				selected ? "shadow-[0_0_0_2px_var(--color-tw-accent)]" : ""
			}`}
			style={{ border: `1px solid ${style.border}` }}
		>
			<div
				className="flex items-center gap-2 px-3 py-2 border-b"
				style={{ borderColor: style.border }}
			>
				<span style={{ color: style.accent }} className="shrink-0">{icon}</span>
				<div className="flex flex-col min-w-0">
					<span className="text-[13px] font-medium text-tw-text-primary leading-tight truncate">
						{label}
					</span>
					{sublabel && (
						<span className="text-[11px] text-tw-text-tertiary leading-tight truncate">
							{sublabel}
						</span>
					)}
				</div>
			</div>
			{children && <div className="px-3 py-2">{children}</div>}
		</div>
	);
}

function Param({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-2 py-0.5">
			<span className="text-[11px] text-tw-text-tertiary">{label}</span>
			<span className="text-[11px] text-tw-text-secondary font-mono bg-tw-inner px-1.5 py-0.5 rounded">
				{value}
			</span>
		</div>
	);
}

function EditableParam({
	label,
	value,
	nodeId,
	paramKey,
	directData,
}: {
	label: string;
	value: number;
	nodeId: string;
	paramKey: string;
	directData?: boolean;
}) {
	const store = useStoreApi();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<string>(String(value));
	const inputRef = useRef<HTMLInputElement>(null);

	if (draft !== String(value) && !editing) {
		setDraft(String(value));
	}
	useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

	const commit = useCallback(() => {
		const val = Number(draft);
		if (draft !== "" && Number.isFinite(val) && val > 0 && val !== value) {
			const { nodes, setNodes } = store.getState();
			setNodes(
				nodes.map((n) => {
					if (n.id !== nodeId) return n;
					if (directData) {
						return { ...n, data: { ...n.data, [paramKey]: Math.floor(val) } };
					}
					const params = { ...((n.data.params as Record<string, unknown>) ?? {}), [paramKey]: Math.floor(val) };
					return { ...n, data: { ...n.data, params } };
				}),
			);
		} else {
			setDraft(String(value));
		}
		setEditing(false);
	}, [draft, value, nodeId, paramKey, directData, store]);

	return (
		<div className="flex items-center justify-between gap-2 py-0.5">
			<span className="text-[11px] text-tw-text-tertiary">{label}</span>
			{editing ? (
				<input
					ref={inputRef}
					type="text"
					inputMode="numeric"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={commit}
					onKeyDown={(e) => {
						if (e.key === "Enter") { e.preventDefault(); commit(); }
						else if (e.key === "Escape") { e.preventDefault(); setDraft(String(value)); setEditing(false); }
					}}
					onClick={(e) => e.stopPropagation()}
					className="w-14 px-2 py-0.5 rounded-md text-[11px] font-medium bg-tw-surface text-tw-text-primary border border-tw-accent/40 outline-none text-center"
				/>
			) : (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); setDraft(String(value)); setEditing(true); }}
					className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-tw-surface text-tw-text-secondary cursor-pointer hover:bg-tw-hover-light"
					title={`Edit ${label.toLowerCase()}`}
				>
					{value}
				</button>
			)}
		</div>
	);
}

function EditableText({
	label,
	value,
	nodeId,
	fieldKey,
	placeholder,
}: {
	label: string;
	value: string;
	nodeId: string;
	fieldKey: string;
	placeholder?: string;
}) {
	const store = useStoreApi();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const prevValueRef = useRef(value);
	const inputRef = useRef<HTMLInputElement>(null);

	if (prevValueRef.current !== value) {
		prevValueRef.current = value;
		setDraft(value);
	}
	useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

	const commit = useCallback(() => {
		if (draft !== value) {
			const { nodes, setNodes } = store.getState();
			setNodes(nodes.map((n) => n.id !== nodeId ? n : { ...n, data: { ...n.data, [fieldKey]: draft } }));
		}
		setEditing(false);
	}, [draft, value, nodeId, fieldKey, store]);

	return (
		<div className="flex items-center justify-between gap-2 py-0.5">
			<span className="text-[11px] text-tw-text-tertiary shrink-0">{label}</span>
			{editing ? (
				<input
					ref={inputRef}
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={commit}
					onKeyDown={(e) => {
						if (e.key === "Enter") { e.preventDefault(); commit(); }
						else if (e.key === "Escape") { e.preventDefault(); setDraft(value); setEditing(false); }
					}}
					onClick={(e) => e.stopPropagation()}
					placeholder={placeholder}
					className="flex-1 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] bg-tw-surface text-tw-text-primary border border-tw-accent/40 outline-none"
				/>
			) : (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); setEditing(true); }}
					className="text-[11px] text-tw-text-secondary font-mono bg-tw-inner px-1.5 py-0.5 rounded truncate max-w-[160px] text-left cursor-pointer hover:bg-tw-hover-light"
					title={`Edit ${label.toLowerCase()}`}
				>
					{value || <span className="text-tw-text-tertiary italic">{placeholder ?? "empty"}</span>}
				</button>
			)}
		</div>
	);
}
const icons = {
	trigger: <TriggerIcon />,
	schedule: <ScheduleIcon />,
	rule: <RuleIcon />,
	condition: <ConditionIcon />,
	logic: <LogicGateIcon />,
	action: <ActionIcon />,
	delay: <DelayIcon />,
	transform: <TransformIcon />,
};

const colors = {
	trigger: NODE_STYLE_MAP.trigger.accent,
	rule: NODE_STYLE_MAP.rule.accent,
	condition: NODE_STYLE_MAP.condition.accent,
	logic: NODE_STYLE_MAP.logic.accent,
	action: NODE_STYLE_MAP.action.accent,
	delay: NODE_STYLE_MAP.delay.accent,
	transform: NODE_STYLE_MAP.transform.accent,
};

const handleBase = "!w-2.5 !h-2.5 !rounded-sm !border !border-tw-border !bg-tw-card";

function BranchHandles() {
	return (
		<>
			<div className="absolute -bottom-4 left-[30%] -translate-x-1/2 flex flex-col items-center">
				<Handle type="source" position={Position.Bottom} id="pass" className="!w-3 !h-3 !rounded-sm !border-0 !relative !transform-none !inset-0" style={{ backgroundColor: HANDLE_COLORS.pass.bg }} />
				<span className="text-[8px] font-bold mt-0.5 select-none" style={{ color: HANDLE_COLORS.pass.bg }}>T</span>
			</div>
			<div className="absolute -bottom-4 left-[70%] -translate-x-1/2 flex flex-col items-center">
				<Handle type="source" position={Position.Bottom} id="fail" className="!w-3 !h-3 !rounded-sm !border-0 !relative !transform-none !inset-0" style={{ backgroundColor: HANDLE_COLORS.fail.bg }} />
				<span className="text-[8px] font-bold mt-0.5 select-none" style={{ color: HANDLE_COLORS.fail.bg }}>F</span>
			</div>
		</>
	);
}

function ConditionBranchHandles() {
	return (
		<>
			<div className="absolute -bottom-4 left-[30%] -translate-x-1/2 flex flex-col items-center">
				<Handle type="source" position={Position.Bottom} id="true" className="!w-3 !h-3 !rounded-sm !border-0 !relative !transform-none !inset-0" style={{ backgroundColor: HANDLE_COLORS.pass.bg }} />
				<span className="text-[8px] font-bold mt-0.5 select-none" style={{ color: HANDLE_COLORS.pass.bg }}>T</span>
			</div>
			<div className="absolute -bottom-4 left-[70%] -translate-x-1/2 flex flex-col items-center">
				<Handle type="source" position={Position.Bottom} id="false" className="!w-3 !h-3 !rounded-sm !border-0 !relative !transform-none !inset-0" style={{ backgroundColor: HANDLE_COLORS.fail.bg }} />
				<span className="text-[8px] font-bold mt-0.5 select-none" style={{ color: HANDLE_COLORS.fail.bg }}>F</span>
			</div>
		</>
	);
}
const triggerLabels: Record<string, string> = {
	pr_opened: "PR Opened",
	pr_edited: "PR Edited",
	issue_opened: "Issue Opened",
	issue_edited: "Issue Edited",
	comment_created: "Comment Created",
	contributor_first_interaction: "First Interaction",
	schedule: "Schedule",
	schedule_daily: "Daily Schedule",
	schedule_weekly: "Weekly Schedule",
	manual: "Manual Run",
	repo_scan: "Repo History Scan",
};

import { RULE_META } from "@tripwire/db/schema/rule-meta";
import { formatCamelCase } from "#/lib/format";
import {
	SIGNAL_REGISTRY,
	SIGNAL_CATEGORIES,
	getSignalsByCategory,
	getOperatorsForType,
} from "@tripwire/core/rules/signal-registry";

const ruleLabels: Record<string, string> = new Proxy(
	Object.fromEntries(Object.entries(RULE_META).map(([k, v]) => [k, v.name])),
	{ get(target, prop, receiver) {
		if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
		return target[prop] ?? formatCamelCase(prop);
	} },
);

const RULE_KEYS = Object.keys(RULE_META) as string[];

const HIDDEN_RULES = new Set(
	Object.entries(RULE_META).filter(([, v]) => v.comingSoon).map(([k]) => k),
);

const actionLabels: Record<string, string> = {
	block: "Block",
	warn: "Warn",
	log: "Log Event",
	close: "Close",
	label: "Add Label",
	comment: "Comment",
	add_to_whitelist: "Whitelist",
	add_to_blacklist: "Blacklist",
	remove_from_whitelist: "Remove Whitelist",
	remove_from_blacklist: "Remove Blacklist",
	notify_slack: "Notify Slack",
	notify_discord: "Notify Discord",
	send_webhook: "Send Webhook",
	request_review: "Request Review",
};
export const TriggerNode = memo(({ data, selected }: NodeProps) => {
	const trigger = (data.trigger as string) ?? "pr_opened";
	const isSchedule = trigger === "schedule" || trigger === "schedule_daily" || trigger === "schedule_weekly";
	const sublabel = isSchedule
		? formatScheduleSublabel(data as Record<string, unknown>)
		: "Trigger";
	return (
		<>
			<NodeShell
				type="trigger"
				icon={isSchedule ? icons.schedule : icons.trigger}
				label={triggerLabels[trigger] ?? trigger}
				sublabel={sublabel}
				selected={selected}
			>
				{data.filters ? (
					<Param label="Filter" value={String(data.filters)} />
				) : null}
			</NodeShell>
			<Handle type="source" position={Position.Bottom} className={`${handleBase} !-bottom-1.5`} />
		</>
	);
});
TriggerNode.displayName = "TriggerNode";

export const RuleNode = memo(({ id, data, selected }: NodeProps) => {
	const rule = (data.rule as string) ?? "accountAge";
	const params = data.params as Record<string, unknown> | undefined;
	return (
		<>
			<Handle type="target" position={Position.Top} className={`${handleBase} !-top-1.5`} />
			<NodeShell
				type="rule"
				icon={icons.rule}
				label={ruleLabels[rule] ?? rule}
				sublabel="Rule Check"
				selected={selected}
			>
				{params && Object.entries(params).map(([k, v]) => {
					if (typeof v === "number") {
						return <EditableParam key={k} label={k} value={v} nodeId={id} paramKey={k} />;
					}
					return <Param key={k} label={k} value={String(v)} />;
				})}
			</NodeShell>
			<BranchHandles />
		</>
	);
});
RuleNode.displayName = "RuleNode";

export const ConditionNode = memo(({ id, data, selected }: NodeProps) => {
	const signalMode = data.signalMode === true;
	const store = useStoreApi();

	const updateData = useCallback((patch: Record<string, unknown>) => {
		const { nodes, setNodes } = store.getState();
		setNodes(nodes.map((n) => n.id !== id ? n : { ...n, data: { ...n.data, ...patch } }));
	}, [id, store]);

	if (!signalMode) {
		const field = (data.field as string) ?? "score";
		const op = (data.operator as string) ?? ">";
		const val = data.value ?? "50";
		return (
			<>
				<Handle type="target" position={Position.Top} className={`${handleBase} !-top-1.5`} />
				<NodeShell
					type="condition"
					icon={icons.condition}
					label="Condition"
					sublabel={`${field} ${op} ${val}`}
					selected={selected}
				>
					<Param label="Field" value={String(field)} />
					<Param label="Operator" value={String(op)} />
					<EditableParam label="Value" value={Number(val) || 0} nodeId={id} paramKey="value" directData />
				</NodeShell>
				<Handle type="source" position={Position.Bottom} id="true" className={`${handleBase} !-bottom-1.5 !left-[30%]`} style={{ backgroundColor: HANDLE_COLORS.pass.bg, borderColor: HANDLE_COLORS.pass.border }} />
				<Handle type="source" position={Position.Bottom} id="false" className={`${handleBase} !-bottom-1.5 !left-[70%]`} style={{ backgroundColor: HANDLE_COLORS.fail.bg, borderColor: HANDLE_COLORS.fail.border }} />
			</>
		);
	}

	const signalId = (data.signal as string) ?? "";
	const op = (data.operator as string) ?? "";
	const val = data.value;
	const signal = SIGNAL_REGISTRY.find((s) => s.id === signalId);
	const signalType = signal?.type ?? "number";
	const operators = getOperatorsForType(signalType);
	const sublabel = signalId ? `${signal?.name ?? signalId} ${op} ${val ?? "?"}` : "Select a signal";

	return (
		<>
			<Handle type="target" position={Position.Top} className={`${handleBase} !-top-1.5`} />
			<NodeShell
				type="condition"
				icon={icons.condition}
				label="Signal Condition"
				sublabel={sublabel}
				selected={selected}
			>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between gap-2 py-0.5">
						<span className="text-[11px] text-tw-text-tertiary shrink-0">Signal</span>
						<select
							value={signalId}
							onChange={(e) => {
								const newSignal = SIGNAL_REGISTRY.find((s) => s.id === e.target.value);
								const newOps = newSignal ? getOperatorsForType(newSignal.type) : [];
								const defaultOp = newOps[0] ?? "";
								const defaultVal = newSignal?.type === "boolean" ? "true" : newSignal?.type === "number" ? "0" : "";
								updateData({ signal: e.target.value, operator: defaultOp, value: defaultVal });
							}}
							onClick={(e) => e.stopPropagation()}
							className="flex-1 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] bg-tw-surface text-tw-text-primary border border-tw-border outline-none cursor-pointer"
						>
							<option value="">Select signal...</option>
							{SIGNAL_CATEGORIES.map((cat) => {
								const signals = getSignalsByCategory(cat.id);
								if (signals.length === 0) return null;
								return (
									<optgroup key={cat.id} label={cat.name}>
										{signals.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}{s.requiresEnrichment ? " (Pro)" : ""}
											</option>
										))}
									</optgroup>
								);
							})}
						</select>
					</div>

					{signalId && (
						<div className="flex items-center justify-between gap-2 py-0.5">
							<span className="text-[11px] text-tw-text-tertiary shrink-0">Operator</span>
							<select
								value={op}
								onChange={(e) => updateData({ operator: e.target.value })}
								onClick={(e) => e.stopPropagation()}
								className="flex-1 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] bg-tw-surface text-tw-text-primary border border-tw-border outline-none cursor-pointer"
							>
								{operators.map((o) => (
									<option key={o} value={o}>{o}</option>
								))}
							</select>
						</div>
					)}

					{signalId && signalType === "boolean" && (
						<div className="flex items-center justify-between gap-2 py-0.5">
							<span className="text-[11px] text-tw-text-tertiary shrink-0">Value</span>
							<select
								value={String(val ?? "true")}
								onChange={(e) => updateData({ value: e.target.value })}
								onClick={(e) => e.stopPropagation()}
								className="flex-1 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] bg-tw-surface text-tw-text-primary border border-tw-border outline-none cursor-pointer"
							>
								<option value="true">true</option>
								<option value="false">false</option>
							</select>
						</div>
					)}

					{signalId && signalType === "number" && (
						<EditableParam label="Value" value={Number(val) || 0} nodeId={id} paramKey="value" directData />
					)}

					{signalId && signalType === "string" && (
						<EditableText label="Value" value={String(val ?? "")} nodeId={id} fieldKey="value" placeholder="Enter value..." />
					)}

					{signal?.requiresEnrichment && (
						<span className="text-[10px] text-tw-accent">Pro</span>
					)}
				</div>
			</NodeShell>
			<ConditionBranchHandles />
		</>
	);
});
ConditionNode.displayName = "ConditionNode";

export const LogicNode = memo(({ data, selected }: NodeProps) => {
	const gate = (data.gate as string) ?? "AND";
	return (
		<>
			<Handle type="target" position={Position.Top} id="a" className={`${handleBase} !-top-1.5 !left-[30%]`} />
			<Handle type="target" position={Position.Top} id="b" className={`${handleBase} !-top-1.5 !left-[70%]`} />
			<NodeShell
				type="logic"
				icon={icons.logic}
				label={gate}
				sublabel="Logic Gate"
				selected={selected}
			/>
			<Handle type="source" position={Position.Bottom} className={`${handleBase} !-bottom-1.5`} />
		</>
	);
});
LogicNode.displayName = "LogicNode";

export const ActionNode = memo(({ id, data, selected }: NodeProps) => {
	const action = (data.action as string) ?? "block";
	const showMessage = ["block", "warn", "comment", "log"].includes(action);
	const showLabel = action === "label";
	const showUrl = ["send_webhook", "notify_slack", "notify_discord"].includes(action);
	return (
		<>
			<Handle type="target" position={Position.Top} className={`${handleBase} !-top-1.5`} />
			<NodeShell
				type="action"
				icon={icons.action}
				label={actionLabels[action] ?? action}
				sublabel="Action"
				selected={selected}
			>
				{showMessage && <EditableText label="Message" value={String(data.message ?? "")} nodeId={id} fieldKey="message" placeholder="Enter message..." />}
				{showLabel && <EditableText label="Label" value={String(data.label ?? "")} nodeId={id} fieldKey="label" placeholder="label-name" />}
				{showUrl && <EditableText label="URL" value={String(data.url ?? "")} nodeId={id} fieldKey="url" placeholder="https://..." />}
			</NodeShell>
		</>
	);
});
ActionNode.displayName = "ActionNode";

export const DelayNode = memo(({ id, data, selected }: NodeProps) => {
	const duration = (data.duration as string) ?? "5m";
	return (
		<>
			<Handle type="target" position={Position.Top} className={`${handleBase} !-top-1.5`} />
			<NodeShell
				type="delay"
				icon={icons.delay}
				label="Delay"
				sublabel={`Wait ${duration}`}
				selected={selected}
			>
				<EditableText label="Duration" value={duration} nodeId={id} fieldKey="duration" placeholder="5m, 1h, 1d" />
			</NodeShell>
			<Handle type="source" position={Position.Bottom} className={`${handleBase} !-bottom-1.5`} />
		</>
	);
});
DelayNode.displayName = "DelayNode";

export const TransformNode = memo(({ data, selected }: NodeProps) => {
	const transform = (data.transform as string) ?? "fetch_github_user";
	const transformLabels: Record<string, string> = {
		fetch_github_user: "Fetch GitHub User",
		compute_score: "Compute Score",
		fetch_pr_files: "Fetch PR Files",
		fetch_repo_activity: "Fetch Repo Activity",
		count_recent_prs: "Count Recent PRs",
		detect_language: "Detect Language",
		scan_history: "Scan Repo History",
	};
	return (
		<>
			<Handle type="target" position={Position.Top} className={`${handleBase} !-top-1.5`} />
			<NodeShell
				type="transform"
				icon={icons.transform}
				label={transformLabels[transform] ?? transform}
				sublabel="Transform / Enrich"
				selected={selected}
			/>
			<Handle type="source" position={Position.Bottom} className={`${handleBase} !-bottom-1.5`} />
		</>
	);
});
TransformNode.displayName = "TransformNode";
export const nodeTypes = {
	trigger: TriggerNode,
	rule: RuleNode,
	condition: ConditionNode,
	logic: LogicNode,
	action: ActionNode,
	delay: DelayNode,
	transform: TransformNode,
};

export { colors as nodeColors, icons as nodeIcons, triggerLabels, ruleLabels, actionLabels, HIDDEN_RULES, RULE_KEYS };
