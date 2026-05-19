import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopNav } from "#/components/layout/top-nav";
import { WorkspaceRedirect } from "#/components/layout/workspace-redirect";
import { WorkspaceProvider, useWorkspace } from "#/lib/workspace-context";
import { AuthProvider } from '@tripwire/auth/components';
import { ChatProvider, useAIChat } from '#/components/chat/chat-context';
import { Button } from "#/components/ui/button";
import { ChatComposer } from "#/components/chat/chat-composer";
import { ChatThread } from "#/components/chat/chat-thread";
import { useTRPC } from "#/integrations/trpc/react";
import { UnicodeSpinner } from "#/components/ui/unicode-spinner";
import { useCustomer } from "autumn-js/react";
import { useRequestNotifications } from "#/lib/use-request-notifications";
import Dither from "#/components/Dither";
import {
	Context,
	ContextTrigger,
	ContextContent,
	ContextContentHeader,
	ContextContentBody,
	ContextContentFooter,
	ContextInputUsage,
	ContextOutputUsage,
} from "#/components/ui/context";
import { AI_MODEL_ID, getContextWindow } from "@tripwire/ai/model-config";
import type { UIMessage } from "#/types/chat";
import { GithubIcon } from "#/components/icons/github";
import { TripwireAskGlyphIcon18 } from "#/components/icons/tripwire-ask-glyph-icon";
import {
	PlusStrokeIcon14,
	StrokeXIcon14,
	ChatBubbleOutlineIcon12,
	StrokeXIcon10Muted,
} from "#/components/icons/app-chrome-icons";
import { TripwireLogo } from "../icons/tripwire-logo";
import { routes } from "#/lib/routes";

export function AppShell() {
	return (
		<AuthProvider>
			<WorkspaceProvider>
				<ChatProvider>
					<AppShellInner />
				</ChatProvider>
			</WorkspaceProvider>
		</AuthProvider>
	);
}

function AppShellInner() {
	useRequestNotifications();
	// Handles auto-redirects: no org in URL → default workspace, "_" placeholder → first repo

	const { isOpen, toggle, close, sendMessage, isLoading, isQuotaExhausted, newChat, messages: chatMessages } = useAIChat();
	const { repos, isLoading: workspaceLoading, orgs } = useWorkspace();
	const needsInstall = !workspaceLoading && orgs.length > 0 && repos.length === 0;

	// Compute cumulative usage from message metadata, with estimation fallback
	const chatUsage = useMemo(() => {
		let inputTokens = 0;
		let outputTokens = 0;
		let costUSD = 0;
		let hasMetadata = false;

		for (const msg of chatMessages) {
			const meta = (msg as unknown as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
			if (meta?.usage) {
				hasMetadata = true;
				const u = meta.usage as Record<string, number>;
				inputTokens += u.inputTokens ?? 0;
				outputTokens += u.outputTokens ?? 0;
			}
			if (typeof meta?.costUSD === "number") {
				costUSD += meta.costUSD;
			}
		}

		// Fallback: estimate tokens from message text (~4 chars per token)
		if (!hasMetadata && chatMessages.length > 0) {
			for (const msg of chatMessages) {
				const parts = (msg as unknown as Record<string, unknown>).parts as Array<{ type: string; text?: string; content?: string }> | undefined;
				let charCount = 0;
				if (parts) {
					for (const p of parts) {
						charCount += (p.text ?? p.content ?? "").length;
					}
				}
				const estimated = Math.ceil(charCount / 4);
				if (msg.role === "user") inputTokens += estimated;
				else outputTokens += estimated;
			}
		}

		return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, costUSD };
	}, [chatMessages]);

	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const isHomePage = currentPath === "/home" || currentPath === "/" || currentPath.endsWith("/home");
	const isChatRoute = currentPath.startsWith("/chat/");
	const isAutomationEditor = /\/automations\/[^/]+$/.test(currentPath);

	const showSidePanel = !isHomePage && !isChatRoute && !isAutomationEditor && isOpen;

	return (
		<div className="h-screen flex flex-col overflow-hidden bg-tw-bg tw-root antialiased">
			<WorkspaceRedirect />
			<TopNav askOpen={isOpen} onToggleAsk={toggle} />
			<div className={`flex-1 min-h-0 flex gap-2 ${isChatRoute ? "" : "px-2 pb-2"}`}>
				<div
					className={`flex-1 min-w-0 relative ${isChatRoute ? "" : "tw-inset"}`}
					style={isChatRoute ? undefined : { boxShadow: "#00000008 0px 1px 4px" }}
				>
					<div className="absolute inset-0 overflow-auto">
						{needsInstall ? <InstallGitHubPrompt /> : <Outlet />}
					</div>
				</div>

				<aside
					className="shrink-0 tw-inset transition-all duration-[360ms]"
					style={{
						width: showSidePanel ? 380 : 0,
						marginRight: showSidePanel ? 0 : -8,
						opacity: showSidePanel ? 1 : 0,
						transform: showSidePanel ? "translateX(0)" : "translateX(24px)",
						transitionTimingFunction: "cubic-bezier(0.19, 1, 0.22, 1)",
					}}
				>
					{showSidePanel && (
						<div className="h-full w-full flex flex-col relative">
							{/* Dither background at the bottom with upward fade */}
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

							<div className="flex items-center justify-between pl-3 pr-2 pt-3 pb-2 shrink-0 relative z-10">
								<div className="flex items-center gap-2 min-w-0">
									<TripwireAskGlyphIcon18 />
									<span className="text-[14px] leading-none text-tw-text-primary font-medium">
										Ask Tripwire
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<Context
											usedTokens={chatUsage.totalTokens}
											maxTokens={getContextWindow(AI_MODEL_ID)}
											usage={{
												inputTokens: chatUsage.inputTokens,
												outputTokens: chatUsage.outputTokens,
											}}
											modelId={AI_MODEL_ID}
											costUSD={chatUsage.costUSD}
										>
											<ContextTrigger className="h-6 px-1.5 text-[11px] text-tw-text-muted" />
											<ContextContent>
												<ContextContentHeader />
												<ContextContentBody>
													<ContextInputUsage />
													<ContextOutputUsage />
												</ContextContentBody>
												<ContextContentFooter />
											</ContextContent>
									</Context>
									<CreditBalancePill />
									<Button variant="ghost"
										onClick={newChat}
										type="button"
										className="flex items-center justify-center size-6 rounded-md hover:bg-tw-hover transition-colors"
										title="New chat"
									>
										<PlusStrokeIcon14 className="text-[#9F9FA9]" />
									</Button>
									<Button variant="ghost"
										onClick={close}
										type="button"
										className="flex items-center justify-center size-6 rounded-md hover:bg-tw-hover transition-colors"
									>
										<StrokeXIcon14 className="text-[#9F9FA9]" />
									</Button>
								</div>
							</div>

							<div className="px-3 pb-3 shrink-0 relative z-10">
								<p className="text-[13px] leading-[19px] text-tw-text-secondary">
									Ask about anything in your digest, or get help investigating a
									flagged contributor.
								</p>
							</div>

							<div className="flex-1 min-h-0 overflow-auto px-2 pb-2 relative z-10">
								<ChatThread />
							</div>

							<div className="relative z-10">
								<SidebarRecentChats />
							</div>

							<div className="px-2 pb-2 shrink-0 relative z-10">
								<ChatComposer
									disabled={isLoading || isQuotaExhausted}
									isLoading={isLoading}
									placeholder={isQuotaExhausted ? "Out of credits" : "Ask anything..."}
									onSend={sendMessage}
								/>
							</div>
						</div>
					)}
				</aside>
			</div>
		</div>
	);
}

function CreditBalancePill() {
	const { data: customer } = useCustomer();
	const balance = customer?.balances?.ai_credits;

	if (!balance) return null;

	const remaining = balance.remaining ?? 0;
	const granted = balance.granted ?? 0;
	const unlimited = balance.unlimited ?? false;

	if (unlimited) return null;

	const isEmpty = remaining <= 0;
	const isLow = !isEmpty && granted > 0 && remaining / granted < 0.2;

	return (
		<span
			className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[14px] font-medium tabular-nums transition-colors ${
				isEmpty
					? "bg-red-500/10 text-red-400"
					: isLow
						? "bg-amber-500/10 text-amber-400"
						: "bg-[#FAFAFA08] text-muted-foreground"
			}`}
		>
			${(remaining / 100).toFixed(2)}
		</span>
	);
}

function SidebarRecentChats() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { loadChat, open } = useAIChat();
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const { repo } = useWorkspace();
	const chatsQuery = useQuery(trpc.chats.list.queryOptions({ limit: 3, repoId: repo?.id }));
	const chats = chatsQuery.data ?? [];

	const listQueryKey = trpc.chats.list.queryKey({ limit: 3, repoId: repo?.id });
	const deleteChat = useMutation(
		trpc.chats.delete.mutationOptions({
			onMutate: async ({ chatId }) => {
				setConfirmDeleteId(null);
				await queryClient.cancelQueries({ queryKey: listQueryKey });
				const previous = queryClient.getQueryData(listQueryKey);
				await new Promise((r) => setTimeout(r, 300));
				queryClient.setQueryData(listQueryKey, (old: typeof chats | undefined) =>
					old ? old.filter((c) => c.id !== chatId) : [],
				);
				return { previous };
			},
			onError: (_err, _vars, ctx) => {
				if (ctx?.previous) {
					queryClient.setQueryData(listQueryKey, ctx.previous);
				}
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: listQueryKey });
			},
		}),
	);

	const handleLoadChat = async (chatId: string) => {
		setLoadingId(chatId);
		try {
			const conv = await queryClient.fetchQuery(
				trpc.chats.get.queryOptions({ chatId }),
			);
			if (conv?.messages) {
				loadChat(chatId, conv.messages as UIMessage[]);
				open();
			}
		} finally {
			setLoadingId(null);
		}
	};

	if (chats.length === 0) return null;

	return (
		<div className="px-2 pb-1 shrink-0">
			<div className="flex items-center justify-between px-1 mb-1">
				<span className="text-[11px] font-medium text-tw-text-muted uppercase tracking-wider">
					Recent
				</span>
			</div>
			<AnimatePresence initial={false}>
				{chats.map((chat) => {
					const isLoading = loadingId === chat.id;
					const isConfirming = confirmDeleteId === chat.id;

					if (isConfirming) {
						return (
							<motion.div
								key={chat.id}
								layout
								transition={{ layout: { duration: 0.25, ease: [0.25, 1, 0.5, 1] } }}
								className="flex items-center gap-2 w-full px-1.5 py-1.5 rounded-lg bg-tw-hover"
							>
								<span className="text-[12px] text-tw-text-secondary flex-1 truncate">
									Delete this chat?
								</span>
								<Button variant="ghost"
									type="button"
									onClick={() => deleteChat.mutate({ chatId: chat.id })}
									className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors px-1"
								>
									Delete
								</Button>
								<Button variant="ghost"
									type="button"
									onClick={() => setConfirmDeleteId(null)}
									className="text-[11px] font-medium text-tw-text-muted hover:text-tw-text-secondary transition-colors px-1"
								>
									Cancel
								</Button>
							</motion.div>
						);
					}

					return (
						<motion.div
							key={chat.id}
							layout
							exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, overflow: "hidden" }}
							transition={{
								layout: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
								duration: 0.2,
								ease: [0.25, 1, 0.5, 1],
							}}
							className={`group flex items-center gap-2 w-full px-1.5 py-1.5 rounded-lg text-left ${
								isLoading
									? "bg-tw-hover"
									: "hover:bg-tw-hover"
							}`}
						>
							<Button variant="ghost"
								type="button"
								disabled={loadingId !== null}
								onClick={() => handleLoadChat(chat.id)}
								className="flex items-center gap-2 flex-1 min-w-0 disabled:opacity-50"
							>
								{isLoading ? (
									<UnicodeSpinner variant="dots" className="text-[12px] text-tw-text-secondary" label="Loading chat" />
								) : (
									<ChatBubbleOutlineIcon12 className="shrink-0 text-tw-text-muted" />
								)}
								<span className={`text-[12px] truncate transition-colors duration-200 ${
									isLoading ? "text-tw-text-primary" : "text-tw-text-secondary"
								}`}>
									{chat.title ?? "New chat"}
								</span>
							</Button>
							<Button variant="ghost"
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setConfirmDeleteId(chat.id);
								}}
								className="shrink-0 flex items-center justify-center size-5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#FAFAFA10] transition-all"
							>
								<StrokeXIcon10Muted />
							</Button>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}

function InstallGitHubPrompt() {
	return (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
				<div className="flex items-center justify-center size-12">
					<TripwireLogo className="size-8 text-tw-text-secondary" />
				</div>
				<div>
					<h2 className="text-[15px] font-medium text-tw-text-primary mb-1">Install the GitHub App</h2>
					<p className="text-[13px] text-tw-text-secondary leading-relaxed">
						Connect a repository to start using Tripwire. You'll be able to configure rules, run automations, and monitor contributions.
					</p>
				</div>
				<Button variant="default" size="sm">
				<Link
					to={routes.api.githubInstall}
					className="flex gap-2"
				>
					<GithubIcon className="size-4 mt-0.5"/>
					Install GitHub App
				</Link>
				</Button>
			</div>
		</div>
	);
}
