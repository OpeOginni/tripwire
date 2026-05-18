import type { Node, Edge } from "@xyflow/react";

export type SimMode = "pass" | "fail" | "user";

export interface SimNodeResult {
	nodeId: string;
	edgeId?: string;
	status: "pass" | "fail" | "skipped" | "executed";
	detail?: string;
}

export interface SimUserData {
	accountAgeDays: number;
	followers: number;
	following: number;
	publicRepos: number;
	publicNonForkRepos: number;
	publicGists: number;
	hasProfileReadme: boolean;
	mergedPrs: number;
	score: number;
	filesChanged?: number;
	username?: string;
}

function evaluateCondition(
	field: string,
	operator: string,
	value: string,
	userData: SimUserData,
): { pass: boolean; detail: string } {
	const numVal = parseFloat(value);
	const fieldMap: Record<string, number | boolean | string | undefined> = {
		score: userData.score,
		accountAgeDays: userData.accountAgeDays,
		publicRepos: userData.publicRepos,
		publicNonForkRepos: userData.publicNonForkRepos,
		followers: userData.followers,
		following: userData.following,
		publicGists: userData.publicGists,
		hasProfileReadme: userData.hasProfileReadme,
		mergedPrs: userData.mergedPrs,
		filesChanged: userData.filesChanged,
		username: userData.username,
	};
	const actual = fieldMap[field];
	if (actual === undefined)
		return { pass: true, detail: `${field} -- unknown field, skipped` };

	let pass: boolean;
	if (typeof actual === "boolean") {
		pass = actual === (value === "true");
	} else if (typeof actual === "string") {
		if (operator === "matches") {
			try {
				pass = new RegExp(value).test(actual);
			} catch {
				pass = actual.includes(value);
			}
		} else if (operator === "==") {
			pass = actual === value;
		} else if (operator === "!=") {
			pass = actual !== value;
		} else {
			pass = true;
		}
	} else {
		switch (operator) {
			case ">":
				pass = actual > numVal;
				break;
			case ">=":
				pass = actual >= numVal;
				break;
			case "<":
				pass = actual < numVal;
				break;
			case "<=":
				pass = actual <= numVal;
				break;
			case "==":
				pass = actual === numVal;
				break;
			case "!=":
				pass = actual !== numVal;
				break;
			default:
				pass = true;
		}
	}
	return {
		pass,
		detail: `${pass ? "PASS" : "FAIL"} -- ${field} is ${actual} (check: ${operator} ${value})`,
	};
}

function evaluateRule(
	rule: string,
	params: Record<string, unknown> | undefined,
	userData: SimUserData,
): { pass: boolean; detail: string } {
	switch (rule) {
		case "accountAge": {
			const threshold = (params?.days as number) ?? 30;
			const pass = userData.accountAgeDays >= threshold;
			return {
				pass,
				detail: `${pass ? "PASS" : "FAIL"} -- account is ${userData.accountAgeDays}d old (requires >= ${threshold}d)`,
			};
		}
		case "minMergedPrs": {
			const threshold = (params?.count as number) ?? 15;
			if (userData.mergedPrs === 0)
				return { pass: true, detail: "SKIP -- merged PR count unavailable" };
			const pass = userData.mergedPrs >= threshold;
			return {
				pass,
				detail: `${pass ? "PASS" : "FAIL"} -- ${userData.mergedPrs} merged PRs (requires >= ${threshold})`,
			};
		}
		case "repoActivityMinimum": {
			const threshold = (params?.minRepos as number) ?? 3;
			const pass = userData.publicNonForkRepos >= threshold;
			return {
				pass,
				detail: `${pass ? "PASS" : "FAIL"} -- ${userData.publicNonForkRepos} non-fork repos (requires >= ${threshold})`,
			};
		}
		case "requireProfileReadme": {
			const pass = userData.hasProfileReadme;
			return {
				pass,
				detail: `${pass ? "PASS" : "FAIL"} -- profile README ${pass ? "exists" : "missing"}`,
			};
		}
		case "contributorScore": {
			const threshold = (params?.minScore as number) ?? 50;
			const pass = userData.score >= threshold;
			return {
				pass,
				detail: `${pass ? "PASS" : "FAIL"} -- score is ${userData.score} (requires >= ${threshold})`,
			};
		}
		case "maxFilesChanged": {
			if (userData.filesChanged === undefined) {
				return { pass: true, detail: "SKIP -- no file data in simulation" };
			}
			const limit = (params?.limit as number) ?? 20;
			const pass = userData.filesChanged <= limit;
			return {
				pass,
				detail: `${pass ? "PASS" : "FAIL"} -- ${userData.filesChanged} files changed (limit: ${limit})`,
			};
		}
		case "maxPrsPerDay":
			return { pass: true, detail: "SKIP -- no PR rate data in simulation" };
		case "cryptoAddressDetection":
			return {
				pass: true,
				detail: "SKIP -- requires content text to analyze",
			};
		case "aiHoneypot":
			return {
				pass: true,
				detail: "SKIP -- requires content text to analyze",
			};
		case "languageRequirement":
			return {
				pass: true,
				detail: "SKIP -- requires content text to analyze",
			};
		case "vouchedUsersOnly":
			return {
				pass: true,
				detail: "SKIP -- requires vouch database lookup",
			};
		default:
			return { pass: true, detail: "Unknown rule" };
	}
}

function evaluateTransform(
	transform: string,
	userData: SimUserData,
): { detail: string; enriched: Record<string, unknown> } {
	switch (transform) {
		case "fetch_github_user":
			return {
				detail: `Fetched profile: @${userData.username ?? "unknown"}, ${userData.accountAgeDays}d old, ${userData.publicRepos} repos, ${userData.followers} followers`,
				enriched: { ...userData },
			};
		case "compute_score":
			return {
				detail: `Computed score: ${userData.score}/100`,
				enriched: { score: userData.score },
			};
		case "fetch_pr_files": {
			const count = userData.filesChanged ?? 0;
			return {
				detail: count > 0
					? `Fetched ${count} changed files`
					: "No file data available in simulation",
				enriched: { filesChanged: count },
			};
		}
		case "scan_history":
			return {
				detail: "Scanned repo history for contributor events",
				enriched: {},
			};
		case "detect_language":
			return {
				detail: "Language detection requires content text (skipped in simulation)",
				enriched: {},
			};
		default:
			return {
				detail: `Transform: ${transform}`,
				enriched: {},
			};
	}
}

function evaluateDelay(data: Record<string, unknown>): string {
	const duration = (data.duration as string) ?? "5m";
	return `Delay: wait ${duration} before continuing`;
}

export function simulateWorkflow(
	nodes: Node[],
	edges: Edge[],
	mode: SimMode,
	userData: SimUserData,
	actionLabels: Record<string, string>,
): SimNodeResult[] {
	const results: SimNodeResult[] = [];
	const nodeMap = new Map(nodes.map((n) => [n.id, n]));
	const outgoing = new Map<string, Edge[]>();
	for (const e of edges) {
		if (!outgoing.has(e.source)) outgoing.set(e.source, []);
		outgoing.get(e.source)!.push(e);
	}
	const nodeOutcome = new Map<string, boolean>();
	const triggers = nodes.filter((n) => n.type === "trigger");
	const queue = [...triggers.map((n) => n.id)];
	const visited = new Set<string>();

	for (const tid of triggers) {
		const trigger = (tid.data.trigger as string) ?? "unknown";
		results.push({ nodeId: tid.id, status: "executed", detail: `Triggered: ${trigger}` });
		nodeOutcome.set(tid.id, true);
	}

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (visited.has(current)) continue;
		visited.add(current);
		const outEdges = outgoing.get(current) ?? [];
		for (const edge of outEdges) {
			const targetNode = nodeMap.get(edge.target);
			if (!targetNode || visited.has(edge.target)) continue;
			const sourceOutcome = nodeOutcome.get(current);
			const sourceHandle = edge.sourceHandle;
			const sourceNode = nodeMap.get(current);

			if (
				sourceNode &&
				(sourceNode.type === "rule" || sourceNode.type === "condition")
			) {
				if (sourceHandle === "pass" && sourceOutcome === false) continue;
				if (sourceHandle === "fail" && sourceOutcome === true) continue;
				if (sourceHandle === "true" && sourceOutcome === false) continue;
				if (sourceHandle === "false" && sourceOutcome === true) continue;
			}

			let pass = true;
			let detail = "";

			switch (targetNode.type) {
				case "rule": {
					if (mode === "pass") {
						pass = true;
						detail = "Forced PASS";
					} else if (mode === "fail") {
						pass = false;
						detail = "Forced FAIL";
					} else {
						const r = evaluateRule(
							targetNode.data.rule as string,
							targetNode.data.params as Record<string, unknown>,
							userData,
						);
						pass = r.pass;
						detail = r.detail;
					}
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: pass ? "pass" : "fail",
						detail,
					});
					break;
				}
				case "condition": {
					if (mode === "pass") {
						pass = true;
						detail = "Forced PASS";
					} else if (mode === "fail") {
						pass = false;
						detail = "Forced FAIL";
					} else {
						const r = evaluateCondition(
							targetNode.data.field as string,
							targetNode.data.operator as string,
							String(targetNode.data.value),
							userData,
						);
						pass = r.pass;
						detail = r.detail;
					}
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: pass ? "pass" : "fail",
						detail,
					});
					break;
				}
				case "logic": {
					const incomingEdges = edges.filter((e) => e.target === edge.target);
					const inputResults = incomingEdges
						.map((e) => nodeOutcome.get(e.source))
						.filter((v) => v !== undefined) as boolean[];
					const gate = targetNode.data.gate as string;
					if (gate === "AND")
						pass =
							inputResults.length > 0 && inputResults.every(Boolean);
					else if (gate === "OR") pass = inputResults.some(Boolean);
					else if (gate === "NOT")
						pass = inputResults.length > 0 && !inputResults[0];
					detail = `${gate}(${inputResults.map((r) => (r ? "T" : "F")).join(", ")}) -> ${pass ? "TRUE" : "FALSE"}`;
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: pass ? "pass" : "fail",
						detail,
					});
					break;
				}
				case "transform": {
					const transform = (targetNode.data.transform as string) ?? "unknown";
					if (mode === "user") {
						const r = evaluateTransform(transform, userData);
						detail = r.detail;
					} else {
						detail = `Transform: ${transform} (simulated)`;
					}
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: "executed",
						detail,
					});
					break;
				}
				case "delay": {
					detail = evaluateDelay(targetNode.data as Record<string, unknown>);
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: "executed",
						detail,
					});
					break;
				}
				case "action": {
					const action = targetNode.data.action as string;
					const actionLabel = actionLabels[action] ?? action;
					detail = `Execute: ${actionLabel}`;
					if (targetNode.data.message) detail += ` -- "${targetNode.data.message}"`;
					if (targetNode.data.label) detail += ` -- label "${targetNode.data.label}"`;
					if (targetNode.data.url) detail += ` -- ${targetNode.data.url}`;
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: "executed",
						detail,
					});
					break;
				}
				default: {
					results.push({
						nodeId: edge.target,
						edgeId: edge.id,
						status: "executed",
						detail: `Unknown node type: ${targetNode.type}`,
					});
					break;
				}
			}
			nodeOutcome.set(edge.target, pass);
			queue.push(edge.target);
		}
	}

	// Check for unreachable nodes (not connected to trigger chain)
	const reachable = new Set(results.map((r) => r.nodeId));
	for (const node of nodes) {
		if (!reachable.has(node.id) && node.type !== "trigger") {
			results.push({
				nodeId: node.id,
				status: "skipped",
				detail: "Unreachable -- not connected to a trigger",
			});
		}
	}

	return results;
}
