import { useState } from "react";
import { Button } from "#/components/ui/button";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "#/integrations/trpc/react";
import { useWorkspace, useWorkspacePath } from "#/lib/workspace-context";
import { useGitHubUserFormatted } from "#/lib/use-github-user";
import { toastManager } from "#/components/ui/toast";
import { toastFromError } from "#/lib/toast-error";
import { invalidateListCaches } from "#/lib/cache";
import { isCustomRuleName, stripCustomRulePrefix } from "#/lib/custom-rules-utils";
import {
	EventPageExternalLinkIcon11,
	EventIssueDotCircleIcon12,
	EventShieldStrokeIcon14,
	EventShieldCheckStrokeIcon14,
	EventUserPlusStrokeIcon14,
	EventRuleResultGlyph,
} from "#/components/icons/event-detail-icons";

export const Route = createFileRoute("/_app/$orgHandle/events/$eventId")({
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();
	const navigate = useNavigate();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { repo } = useWorkspace();
	const homePath = useWorkspacePath("home");
	const eventsPath = useWorkspacePath("events");
	const [actionStatus, setActionStatus] = useState<"idle" | "blacklisted" | "safe" | "closed">("idle");

	// Fetch the event
	const eventQuery = useQuery({
		...trpc.events.get.queryOptions({ eventId }),
		enabled: !!eventId,
	});

	const event = eventQuery.data;
	const isLoading = eventQuery.isPending;
	const error = eventQuery.error;

	// Check if user is already blacklisted
	const repoId = event?.repo?.id || repo?.id;
	const blacklistQuery = useQuery({
		...trpc.blacklist.list.queryOptions({ repoId: repoId || "" }),
		enabled: !!repoId,
	});
	const targetUsername = event?.targetGithubUsername;
	const isAlreadyBlacklisted = blacklistQuery.data?.some(
		(entry) => entry.githubUsername === targetUsername
	) ?? false;

	// Fetch real GitHub user data
	const githubUser = useGitHubUserFormatted(targetUsername ?? undefined);

	// Fetch contributor score
	const scoreQuery = useQuery({
		...trpc.reputation.getScore.queryOptions({
			repoId: repoId || "",
			username: targetUsername || "",
		}),
		enabled: !!repoId && !!targetUsername,
	});

	// Blacklist mutation
	const blacklistMutation = useMutation({
		...trpc.blacklist.add.mutationOptions(),
		onSuccess: () => {
			setActionStatus("blacklisted");
			if (repoId) invalidateListCaches(queryClient, repoId);
			toastManager.add({
				type: "success",
				title: "User blacklisted",
				description: `@${targetUsername} has been added to the blacklist.`,
			});
		},
		onError: (err) => toastFromError(err, { fallbackTitle: "Failed to blacklist" }),
	});

	// Whitelist mutation
	const whitelistMutation = useMutation({
		...trpc.whitelist.add.mutationOptions(),
		onSuccess: () => {
			setActionStatus("safe");
			if (repoId) invalidateListCaches(queryClient, repoId);
			toastManager.add({
				type: "success",
				title: "User whitelisted",
				description: `@${targetUsername} has been added to the whitelist.`,
			});
		},
		onError: (err) => toastFromError(err, { fallbackTitle: "Failed to whitelist" }),
	});

	if (isLoading) {
		return (
			<div className="min-h-full flex items-center justify-center">
				<div className="w-6 h-6 border-2 border-tw-text-tertiary border-t-tw-accent rounded-full animate-spin" />
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-full flex flex-col items-center justify-center gap-4">
				<p className="text-tw-text-secondary">Event not found</p>
				<Button variant="ghost"
					type="button"
					onClick={() => navigate({ to: eventsPath })}
					className="text-tw-accent hover:underline"
				>
					Back to Events
				</Button>
			</div>
		);
	}

	const displayEvent = event;

	const sevColor =
		displayEvent?.severity === "error"
			? "#F56D5D"
			: displayEvent?.severity === "success"
				? "#67E19F"
				: "#D1BC00";

	const username = displayEvent?.targetGithubUsername || "unknown";
	const user = githubUser.data;

	return (
		<div className="relative min-h-full pb-16">
			<div className="max-w-2xl w-[672px] mx-auto pt-12 pb-8 px-4 flex flex-col gap-5">
				{/* Breadcrumb */}
				<div className="flex items-center gap-1.5 text-[13px] text-tw-text-tertiary">
					<Link
						to={homePath}
						className="hover:text-tw-text-secondary flex items-center gap-1 transition-colors"
					>
						<span>←</span> Home
					</Link>
					<span className="text-[#363639]">/</span>
					<Link
						to={eventsPath}
						className="hover:text-tw-text-secondary transition-colors"
					>
						Events
					</Link>
					<span className="text-[#363639]">/</span>
					<span className="font-mono text-tw-text-secondary">
						{displayEvent?.githubRef || eventId.slice(0, 8)}
					</span>
				</div>

				{/* Hero */}
				<div className="flex flex-col items-start rounded-xl py-1 px-2 gap-3">
					<div className="flex items-center gap-2">
						<SeverityPill severity={displayEvent?.severity || "warning"} />
						<StatusChip status="open" />
						<span className="text-[11px] text-tw-text-tertiary font-mono px-2 py-0.5 rounded bg-[#ffffff08]">
							id: {eventId.slice(0, 8)}
						</span>
					</div>
					<h1
						className="text-[28px] leading-[36px] text-tw-text-primary tracking-[-0.01em] m-0"
						style={{
							fontFamily: "'Playfair Display', serif",
							fontWeight: 500,
						}}
					>
						{getEventTitle(displayEvent?.action || "", displayEvent?.severity)}
					</h1>
					<p className="text-[16px] leading-[24px] text-[#EEEEEE80] m-0 max-w-[560px]">
						{displayEvent?.description ||
							`Tripwire flagged activity from @${username}`}
					</p>
					<div className="flex items-center flex-wrap gap-3 mt-1 text-[13px] text-tw-text-tertiary">
						{(() => {
							const fullName = displayEvent?.repo?.fullName;
							const ref = displayEvent?.githubRef;
							const ghUrl = buildGitHubRefUrl(fullName, ref, displayEvent?.contentType);
							const body = (
								<>
									<EventIssueDotCircleIcon12 color={sevColor} />
									{fullName || "unknown/repo"}{" "}
									<span className="font-mono text-tw-text-secondary">
										{ref || "#???"}
									</span>
									{ghUrl ? (
										<EventPageExternalLinkIcon11 className="ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
									) : null}
								</>
							);
							return ghUrl ? (
								<a
									href={ghUrl}
									target="_blank"
									rel="noreferrer noopener"
									className="group flex items-center gap-1.5 hover:text-tw-text-secondary transition-colors"
								>
									{body}
								</a>
							) : (
								<span className="flex items-center gap-1.5">{body}</span>
							);
						})()}
						<span className="text-[#363639]">·</span>
						<span>{formatRelativeTime(displayEvent?.createdAt)}</span>
					</div>
				</div>

				{/* Primary actions row */}
				<div className="flex items-center gap-2 px-2">
					{actionStatus === "idle" ? (
						<>
							{/* Show what Tripwire already did */}
							{isAlreadyActioned(displayEvent?.action) && (
								<div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-tw-inner text-[13px] text-tw-text-secondary">
									<EventShieldCheckStrokeIcon14 />
									<span>
									Tripwire {getActionedLabel(displayEvent?.action, displayEvent?.severity)}
								</span>
								</div>
							)}
							{/* Blacklist option */}
							<ActionPill
								variant={isAlreadyActioned(displayEvent?.action) ? "default" : "primary"}
								onClick={() => {
									const repoId = displayEvent?.repo?.id || repo?.id;
									if (repoId && username !== "unknown") {
										blacklistMutation.mutate({
											repoId,
											githubUsername: username,
										});
									}
								}}
								disabled={blacklistMutation.isPending || isAlreadyBlacklisted}
							>
								<EventShieldStrokeIcon14 />
								{isAlreadyBlacklisted
									? `@${username} is blacklisted`
									: blacklistMutation.isPending
										? "Adding..."
										: `Blacklist @${username}`}
							</ActionPill>
							{/* Whitelist option */}
							<ActionPill
								variant="ghost"
								onClick={() => {
									const repoId = displayEvent?.repo?.id || repo?.id;
									if (repoId && username !== "unknown") {
										whitelistMutation.mutate({
											repoId,
											githubUsername: username,
										});
									}
								}}
								disabled={whitelistMutation.isPending}
							>
								<EventUserPlusStrokeIcon14 />
								{whitelistMutation.isPending ? "Adding..." : "Add to whitelist"}
							</ActionPill>
						</>
					) : (
						<div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-tw-inner text-[13px]">
							{actionStatus === "blacklisted" && (
								<>
									<EventShieldStrokeIcon14 />
									<span className="text-tw-text-primary">
										@{username} has been blacklisted
									</span>
								</>
							)}
							{actionStatus === "safe" && (
								<>
									<EventUserPlusStrokeIcon14 />
									<span className="text-tw-text-primary">
										@{username} added to whitelist
									</span>
								</>
							)}
						</div>
					)}
				</div>

				{/* Flagged content */}
				<Block label="Flagged content">
					<div className="flex flex-col gap-2.5 pt-1">
						<div className="px-1">
							<OutlineCard>
								<div className="flex items-center gap-2 px-0.5 py-0.5">
									<img
										src={user?.avatar || `https://github.com/${username}.png`}
										className="w-[22px] h-[22px] rounded-full shrink-0"
										alt=""
									/>
									<span className="text-[14px] leading-5 text-tw-text-primary whitespace-nowrap">
										@{username}
									</span>
									<span className="text-[13px] text-tw-text-tertiary whitespace-nowrap">
										opened this {displayEvent?.contentType || "issue"}{" "}
										{formatRelativeTime(displayEvent?.createdAt)}
									</span>
								</div>
							</OutlineCard>
						</div>
						<div className="rounded-[10px] bg-tw-inner p-3">
							<div className="text-[14px] leading-5 text-tw-text-primary mb-2">
								Content flagged by Tripwire
							</div>
							<pre className="text-[12.5px] font-mono text-tw-text-secondary whitespace-pre-wrap leading-[20px] m-0">
								{displayEvent?.description || "No content preview available."}
							</pre>
						</div>
					</div>
				</Block>

				{/* Rule trace */}
				<Block
					label="Rule trace"
					note={`${displayEvent?.ruleName ? "1 rule triggered" : "Rules evaluated"}`}
				>
					<div className="flex flex-col gap-[3px]">
						{displayEvent?.ruleName ? (
							<>
								{isCustomRuleName(displayEvent.ruleName) && (
									<div className="flex items-center gap-1.5 px-3 py-1">
										<span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[11px] font-medium text-purple-300 leading-none">
											Custom Rule
										</span>
									</div>
								)}
								<RuleTraceRow
									label={formatRuleName(displayEvent.ruleName)}
									result={
										displayEvent.severity === "error" ? "blocked" : "flagged"
									}
									detail="Rule triggered on this content"
								/>
							</>
						) : (
							<div className="rounded-[10px] bg-tw-inner px-3 py-2.5 text-[13px] text-tw-text-secondary">
								No rule trace available
							</div>
						)}
					</div>
				</Block>

				{/* Contributor */}
				<Block label="Contributor" note={githubUser.isLoading ? "Loading..." : user ? `${user.followersFormatted} followers` : "Error loading"}>
					<div className="rounded-[10px] bg-tw-inner p-3 flex flex-col gap-4">
						{/* Identity + actions */}
						<div className="flex items-center gap-3">
							<div className="relative shrink-0">
								<img
									src={user?.avatar || `https://github.com/${username}.png`}
									className="w-12 h-12 rounded-full"
									alt=""
								/>
								<span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-tw-surface flex items-center justify-center">
									<span
										className="w-2 h-2 rounded-full"
										style={{ backgroundColor: sevColor }}
									/>
								</span>
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<Link
										to="/users/$username"
										params={{ username }}
										className="text-[15px] leading-5 text-tw-text-primary font-medium hover:text-tw-accent transition-colors"
									>
										@{username}
									</Link>
									{user?.location && (
										<>
											<span className="text-[11px] text-tw-text-tertiary">·</span>
											<span className="text-[12px] text-tw-text-tertiary">
												{user.location}
											</span>
										</>
									)}
								</div>
								<div className="text-[12px] leading-[18px] text-tw-text-tertiary mt-0.5 truncate">
									{githubUser.isLoading ? (
										"Loading profile..."
									) : user ? (
										<>Joined {user.accountAge} ago · {user.publicReposFormatted} public repos</>
									) : (
										"Could not load profile"
									)}
								</div>
							</div>
							<a
								href={`https://github.com/${username}`}
								target="_blank"
								rel="noopener noreferrer"
								className="shrink-0 text-[12px] text-tw-text-secondary hover:text-tw-text-primary transition-colors rounded-md px-2 py-1 hover:bg-tw-inner"
							>
								View profile →
							</a>
						</div>

						{/* Contributor score */}
						{scoreQuery.data?.score && (
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-2">
									<ContributorScoreBadge total={scoreQuery.data.score.total} />
									<span className="text-[12px] text-tw-text-tertiary">
										Trust score
									</span>
								</div>
								<ContributorScoreBar score={scoreQuery.data.score} />
							</div>
						)}

						{/* Stat grid */}
						{githubUser.isLoading ? (
							<div className="flex items-center justify-center py-4">
								<div className="w-4 h-4 border-2 border-tw-text-tertiary border-t-tw-accent rounded-full animate-spin" />
							</div>
						) : user ? (
							<div className="grid grid-cols-2 gap-x-6">
								{[
									{
										label: "Account age",
										value: user.accountAge,
										bad: user.accountAge.includes("day") || user.accountAge.includes("month"),
									},
									{
										label: "Public repos",
										value: user.publicReposFormatted,
										bad: user.publicRepos < 3,
									},
									{
										label: "Followers",
										value: user.followersFormatted,
										bad: user.followers < 5,
									},
									{
										label: "Total stars",
										value: user.totalStarsFormatted,
										bad: user.totalStars < 10,
									},
									{
										label: "Profile README",
										value: user.hasReadme ? "Yes" : "No",
										bad: !user.hasReadme,
									},
								].map((stat, index, stats) => (
									<div
										key={stat.label}
										className={`flex items-center justify-between py-2 ${index < stats.length - 1 ? "border-b border-tw-border" : ""}`}
									>
										<span className="text-[12px] text-tw-text-tertiary">
											{stat.label}
										</span>
										<span className="text-[13px] text-tw-text-primary tabular-nums flex items-center gap-1.5">
											{stat.value}
											{stat.bad && (
												<span className="w-1.5 h-1.5 rounded-full bg-tw-error" />
											)}
										</span>
									</div>
								))}
							</div>
						) : (
							<div className="text-[13px] text-tw-text-tertiary text-center py-4">
								Could not load GitHub profile data
							</div>
						)}
					</div>
				</Block>

				{/* Timeline */}
				<Block label="Timeline" note="Event history">
					<div className="flex flex-col gap-[3px]">
						<TimelineRow
							time={formatRelativeTime(displayEvent?.createdAt)}
							kind="opened"
							label={`${displayEvent?.contentType || "Content"} received`}
							detail={`From @${username}`}
						/>
						<TimelineRow
							time={formatRelativeTime(displayEvent?.createdAt)}
							kind="pipeline"
							label="Tripwire pipeline started"
							detail="Rules evaluated"
						/>
						{displayEvent?.ruleName && (
							<TimelineRow
								time={formatRelativeTime(displayEvent?.createdAt)}
								kind={displayEvent.severity === "error" ? "block" : "flag"}
								label={`${formatRuleName(displayEvent.ruleName)} → ${displayEvent.severity === "error" ? "blocked" : "flagged"}`}
								detail={displayEvent.description || "Rule triggered"}
							/>
						)}
					</div>
				</Block>
			</div>
		</div>
	);
}


function Block({
	label,
	note,
	children,
}: {
	label: string;
	note?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col relative rounded-xl overflow-hidden gap-[3px] w-full bg-tw-card p-1">
			<div className="flex items-baseline justify-between px-2 pt-1.5 pb-0.5 gap-4">
				<span className="text-[11px] uppercase tracking-[0.08em] text-tw-text-tertiary font-medium shrink-0">
					{label}
				</span>
				{note && (
					<span className="text-[11px] text-tw-text-tertiary text-right truncate">
						{note}
					</span>
				)}
			</div>
			{children}
		</section>
	);
}

function OutlineCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="rounded-[10px]"
			style={{ outline: "2px solid #6E6E6E", outlineOffset: "2px" }}
		>
			<div className="rounded-[10px] bg-tw-inner p-2">{children}</div>
		</div>
	);
}

function ActionPill({
	children,
	variant = "default",
	onClick,
	disabled = false,
}: {
	children: React.ReactNode;
	variant?: "primary" | "default" | "ghost";
	onClick?: () => void;
	disabled?: boolean;
}) {
	const base =
		"flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[13px] leading-none transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
	if (variant === "primary") {
		return (
			<Button variant="ghost"
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={`${base} bg-tw-text-primary text-tw-bg hover:bg-white`}
			>
				{children}
			</Button>
		);
	}
	if (variant === "ghost") {
		return (
			<Button variant="ghost"
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={`${base} text-tw-text-secondary hover:text-tw-text-primary hover:bg-tw-card`}
			>
				{children}
			</Button>
		);
	}
	return (
		<Button variant="ghost"
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`${base} bg-tw-card text-tw-text-primary hover:bg-tw-hover`}
		>
			{children}
		</Button>
	);
}

function SeverityPill({ severity }: { severity: string }) {
	const conf: Record<string, { color: string; label: string }> = {
		error: { color: "#F56D5D", label: "High severity" },
		warning: { color: "#D1BC00", label: "Medium severity" },
		success: { color: "#67E19F", label: "Allowed" },
		info: { color: "#9F9FA9", label: "Info" },
	};
	const severityConfig = conf[severity] || conf.info;
	return (
		<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-tw-card text-tw-text-primary">
			<span
				className="w-1.5 h-1.5 rounded-full"
				style={{ backgroundColor: severityConfig.color }}
			/>
			{severityConfig.label}
		</span>
	);
}

function StatusChip({ status }: { status: string }) {
	return (
		<span className="inline-flex items-center px-2 py-0.5 rounded-md bg-tw-card text-tw-text-secondary text-[11px] font-medium capitalize">
			{status}
		</span>
	);
}

function RuleTraceRow({
	label,
	result,
	detail,
}: {
	label: string;
	result: "blocked" | "flagged" | "passed" | "skipped";
	detail: string;
}) {
	const resultColors: Record<string, string> = {
		blocked: "#F56D5D",
		flagged: "#D1BC00",
		passed: "#67E19F",
		skipped: "#6E6E6E",
	};
	return (
		<div className="rounded-[10px] bg-tw-inner px-3 py-2.5 flex items-center gap-3">
			<EventRuleResultGlyph result={result} />
			<div className="flex-1 min-w-0">
				<div className="text-[14px] leading-5 text-tw-text-primary">{label}</div>
				<div className="text-[12px] leading-[18px] text-tw-text-tertiary truncate">
					{detail}
				</div>
			</div>
			<span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md bg-tw-card text-tw-text-secondary">
				<span
					className="w-1.5 h-1.5 rounded-full"
					style={{ backgroundColor: resultColors[result] }}
				/>
				{result.charAt(0).toUpperCase() + result.slice(1)}
			</span>
		</div>
	);
}

function TimelineRow({
	time,
	kind,
	label,
	detail,
}: {
	time: string;
	kind: string;
	label: string;
	detail: string;
}) {
	const kindColors: Record<string, string> = {
		opened: "#9F9FA9",
		pipeline: "#34A6FF",
		block: "#F56D5D",
		flag: "#D1BC00",
		action: "#67E19F",
		notify: "#B4B4B4",
	};
	const accent = kindColors[kind] || "#9F9FA9";

	return (
		<div className="rounded-[10px] bg-tw-inner p-2 flex items-start gap-2.5">
			<div
				className="w-[10px] h-[10px] rounded-full mt-1 shrink-0"
				style={{ backgroundColor: accent }}
			/>
			<div className="flex-1 min-w-0">
				<div className="text-[13px] leading-5 text-tw-text-primary">{label}</div>
				<div className="text-[11px] text-tw-text-tertiary">{detail}</div>
			</div>
			<span className="text-[11px] text-tw-text-tertiary whitespace-nowrap font-mono">
				{time}
			</span>
		</div>
	);
}


function isAlreadyActioned(action: string | undefined): boolean {
	const actionedActions = [
		"pipeline_blocked",
		"pipeline_warned",
		"pipeline_logged",
		"pr_closed",
		"issue_closed",
		"issue_deleted",
		"comment_deleted",
		"blacklist_blocked",
	];
	return action ? actionedActions.includes(action) : false;
}

function getActionedLabel(
	action: string | undefined,
	severity?: string | null,
): string {
	// Legacy events emitted pipeline_blocked for warn/log outcomes too;
	// fall back to severity so historical rows render the right verb.
	if (action === "pipeline_blocked") {
		if (severity === "warning") return "flagged this content";
		if (severity === "info") return "logged this content";
		return "blocked this content";
	}
	const labels: Record<string, string> = {
		pipeline_warned: "flagged this content",
		pipeline_logged: "logged this content",
		pr_closed: "closed this PR",
		issue_closed: "closed this issue",
		issue_deleted: "deleted this issue",
		comment_deleted: "deleted this comment",
		blacklist_blocked: "blocked this user",
	};
	return labels[action || ""] || "took action";
}

function getEventTitle(action: string, severity: string | null | undefined): string {
	const titles: Record<string, string> = {
		pipeline_blocked: "Content blocked",
		pipeline_allowed: "Content allowed",
		rule_near_miss: "Near miss warning",
		blacklist_blocked: "Blacklisted user blocked",
		whitelist_bypass: "Whitelist bypass",
		pr_closed: "Pull request closed",
		issue_closed: "Issue closed",
		comment_deleted: "Comment deleted",
	};
	let title = titles[action] || "Flagged activity";
	if (severity === "error") title = `Blocked — ${title.toLowerCase()}`;
	if (severity === "warning" && action !== "rule_near_miss")
		title = `Suspected spam`;
	return title;
}

import { RULE_META } from "@tripwire/db/schema/rule-meta";
function formatRuleName(ruleName: string): string {
	if (isCustomRuleName(ruleName)) {
		return stripCustomRulePrefix(ruleName);
	}
	return (RULE_META as Record<string, { name: string }>)[ruleName]?.name ?? ruleName;
}

function formatRelativeTime(date: Date | undefined | null): string {
	if (!date) return "Unknown time";
	const now = new Date();
	const diff = now.getTime() - new Date(date).getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days === 1) return "yesterday";
	return `${days}d ago`;
}

function buildGitHubRefUrl(
	fullName: string | null | undefined,
	ref: string | null | undefined,
	contentType: string | null | undefined,
): string | null {
	if (!fullName) return null;
	const base = `https://github.com/${fullName}`;
	if (!ref) return base;
	const match = ref.match(/^#(\d+)(?:\/comment\/(\d+))?/);
	if (!match) return base;
	const num = match[1];
	const commentId = match[2];
	const path = contentType === "pull_request" ? "pull" : "issues";
	if (commentId) return `${base}/${path}/${num}#issuecomment-${commentId}`;
	return `${base}/${path}/${num}`;
}

function getScoreColor(total: number): string {
	if (total >= 70) return "#67E19F";
	if (total >= 40) return "#D1BC00";
	return "#F56D5D";
}

function ContributorScoreBadge({ total }: { total: number }) {
	const color = getScoreColor(total);
	return (
		<span
			className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium"
			style={{ backgroundColor: `${color}20`, color }}
		>
			{total}/100
		</span>
	);
}

function ContributorScoreBar({
	score,
}: {
	score: {
		total: number;
		globalReputation: number;
		communitySignals: number;
		repoHistory: number;
		redFlags: number;
	};
}) {
	const segments = [
		{ label: "Global", value: score.globalReputation, max: 40, color: "#34A6FF" },
		{ label: "Community", value: score.communitySignals, max: 30, color: "#A78BFA" },
		{ label: "History", value: score.repoHistory, max: 20, color: "#67E19F" },
	];
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex h-1.5 rounded-full overflow-hidden bg-tw-surface gap-[1px]">
				{segments.map((s) => (
					<div
						key={s.label}
						className="h-full rounded-full transition-all"
						style={{
							width: `${(s.value / 100) * 100}%`,
							backgroundColor: s.color,
							minWidth: s.value > 0 ? "2px" : "0",
						}}
					/>
				))}
				{score.redFlags < 0 && (
					<div
						className="h-full rounded-full"
						style={{
							width: `${(Math.abs(score.redFlags) / 100) * 100}%`,
							backgroundColor: "#F56D5D",
							minWidth: "2px",
						}}
					/>
				)}
			</div>
			<div className="flex items-center gap-3 text-[10px] text-tw-text-tertiary">
				{segments.map((s) => (
					<span key={s.label} className="flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
						{s.label} {s.value}
					</span>
				))}
				{score.redFlags < 0 && (
					<span className="flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full bg-tw-error" />
						Flags {score.redFlags}
					</span>
				)}
			</div>
		</div>
	);
}
