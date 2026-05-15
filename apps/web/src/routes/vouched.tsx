import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "@tripwire/auth/client";
import { useTRPC } from "#/integrations/trpc/react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { toastFromError } from "#/lib/toast-error";
import { TripwireLogo } from "#/components/icons/tripwire-logo";
import { GithubIcon } from "#/components/icons/github";

export const Route = createFileRoute("/vouched")({
	component: VouchedUsersPage,
});

function VouchedUsersPage() {
	const trpc = useTRPC();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(0);
	const limit = 50;

	const vouchQuery = useQuery({
		...trpc.vouches.list.queryOptions({
			limit,
			offset: page * limit,
			search: search || undefined,
		}),
	});

	const users = vouchQuery.data?.users ?? [];
	const total = vouchQuery.data?.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return (
		<div className="h-screen flex flex-col overflow-hidden bg-tw-bg text-tw-text-primary">
			{/* Top bar — matches app shell outset */}
			<header className="shrink-0 flex items-center justify-between h-12 px-4">
				<a href="/" className="flex items-center gap-2">
					<TripwireLogo className="w-5 h-5" />
					<span className="text-[14px] font-medium text-tw-text-primary">tripwire</span>
				</a>
				<a
					href="https://github.com/bountydotnew/tripwire"
					target="_blank"
					rel="noopener noreferrer"
					className="text-[12px] text-tw-text-tertiary hover:text-tw-text-secondary transition-colors"
				>
					<GithubIcon className="w-5 h-5 text-white" />
				</a>
			</header>

			{/* Inset content area — matches app shell */}
			<div className="flex-1 min-h-0 px-2 pb-2">
				<div className="tw-inset h-full overflow-auto" style={{ boxShadow: "#00000008 0px 1px 4px" }}>
					<div className="max-w-2xl mx-auto px-4 py-12">
				{/* Header */}
				<header className="flex items-start justify-between mb-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-[22px] font-semibold tracking-[-0.02em] m-0 text-tw-text-primary">
							Vouched contributors
						</h1>
						<p className="text-[13px] text-tw-text-tertiary m-0">
							{total} user{total !== 1 ? "s" : ""} vouched by Tripwire maintainers
						</p>
					</div>
					<ApplyButton />
				</header>

				{/* Search */}
				<div className="mb-5">
					<div className="flex items-center gap-2 h-9 rounded-lg bg-tw-card px-2.5">
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-tw-text-tertiary">
							<circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
							<path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
						</svg>
						<input
							type="text"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(0);
							}}
							placeholder="Search users..."
							className="flex-1 bg-transparent outline-none text-[13px] text-tw-text-primary placeholder:text-tw-text-tertiary"
						/>
						{search && (
							<button
								type="button"
								onClick={() => { setSearch(""); setPage(0); }}
								className="text-tw-text-tertiary hover:text-tw-text-secondary transition-colors cursor-pointer"
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
									<path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
								</svg>
							</button>
						)}
					</div>
				</div>

				{/* List */}
				{vouchQuery.isPending ? (
					<div className="flex items-center justify-center py-16">
						<div className="w-5 h-5 border-2 border-tw-text-tertiary border-t-tw-accent rounded-full animate-spin" />
					</div>
				) : users.length === 0 ? (
					<div className="rounded-xl bg-tw-card p-8 text-center">
						<p className="text-[13px] text-tw-text-tertiary m-0">
							{search ? `No users matching "${search}"` : "No vouched users yet."}
						</p>
					</div>
				) : (
					<div className="rounded-xl bg-tw-card p-1 flex flex-col gap-0.5">
						{users.map((user) => (
							<a
								key={user.githubUsername}
								href={`https://github.com/${user.githubUsername}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-3 h-12 px-2.5 rounded-lg hover:bg-tw-hover transition-colors group"
							>
								<img
									src={user.avatarUrl || `https://github.com/${user.githubUsername}.png`}
									alt=""
									className="w-7 h-7 rounded-full shrink-0"
								/>
								<div className="flex-1 min-w-0">
									<span className="text-[13px] text-tw-text-primary group-hover:text-tw-accent transition-colors font-medium">
										@{user.githubUsername}
									</span>
								</div>
								<span className="text-[11px] text-tw-text-tertiary tabular-nums">
									{user.vouchCount} vouch{user.vouchCount !== 1 ? "es" : ""}
								</span>
							</a>
						))}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between mt-4">
						<span className="text-[11px] text-tw-text-tertiary tabular-nums">
							{page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={page === 0}
								className="px-2.5 py-1 rounded-md text-[12px] text-tw-text-secondary hover:text-tw-text-primary hover:bg-tw-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
							>
								Prev
							</button>
							<button
								type="button"
								onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
								disabled={page >= totalPages - 1}
								className="px-2.5 py-1 rounded-md text-[12px] text-tw-text-secondary hover:text-tw-text-primary hover:bg-tw-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
							>
								Next
							</button>
						</div>
					</div>
				)}
					</div>
				</div>
			</div>
		</div>
	);
}

function ApplyButton() {
	const trpc = useTRPC();
	const { data: session } = authClient.useSession();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const submit = useMutation(
		trpc.vouches.requestVouch.mutationOptions({
			onSuccess: () => setSubmitted(true),
			onError: (err) => toastFromError(err, { fallbackTitle: "Request failed" }),
		}),
	);

	const canSubmit = useMemo(() => reason.trim().length >= 10 && !submit.isPending, [reason, submit.isPending]);

	const handleLogin = useCallback(async () => {
		await authClient.signIn.social({
			provider: "github",
			callbackURL: typeof window !== "undefined" ? window.location.href : "/vouched",
		});
	}, []);

	return (
		<>
			<Button size="xs" onClick={() => setOpen(true)} className="shrink-0">
				Apply to be vouched
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton
					className="w-full max-w-[400px] border-tw-border bg-tw-card p-0"
				>
					{submitted ? (
						<>
							<DialogHeader className="px-5 pt-5 pb-4">
								<DialogTitle className="text-[15px] leading-5 font-medium text-tw-text-primary">
									Request submitted
								</DialogTitle>
							</DialogHeader>
							<div className="px-5 pb-5 flex flex-col gap-3">
								<p className="text-[13px] text-tw-text-secondary m-0">
									An admin will review your request. You'll be added to the directory if approved.
								</p>
								<Button
									size="xs"
									onClick={() => { setOpen(false); setSubmitted(false); setReason(""); }}
									className="self-start"
								>
									Done
								</Button>
							</div>
						</>
					) : !session ? (
						<>
							<DialogHeader className="px-5 pt-5 pb-4">
								<DialogTitle className="text-[15px] leading-5 font-medium text-tw-text-primary">
									Sign in to apply
								</DialogTitle>
							</DialogHeader>
							<div className="px-5 pb-5 flex flex-col gap-3">
								<p className="text-[13px] text-tw-text-secondary m-0">
									Connect your GitHub account so we can verify your identity.
								</p>
								<Button size="xs" onClick={handleLogin} className="self-start">
									Sign in with GitHub
								</Button>
							</div>
						</>
					) : (
						<>
							<DialogHeader className="px-5 pt-5 pb-4">
								<DialogTitle className="text-[15px] leading-5 font-medium text-tw-text-primary">
									Apply to be vouched
								</DialogTitle>
							</DialogHeader>
							<div className="px-5 pb-5 flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<label className="text-[12px] font-medium text-tw-text-secondary">
										Why should you be vouched?
									</label>
									<textarea
										value={reason}
										onChange={(e) => setReason(e.target.value)}
										rows={4}
										placeholder="Share your GitHub contributions, projects, or any context that supports your request."
										className="w-full rounded-lg bg-tw-surface border border-tw-border text-[13px] text-tw-text-primary p-3 outline-none focus:border-tw-accent transition-colors resize-none"
										autoFocus
									/>
									<p className="text-[11px] text-tw-text-tertiary m-0">
										{reason.trim().length}/2000 — minimum 10 characters
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Button size="xs" onClick={() => submit.mutate({ reason })} disabled={!canSubmit}>
										{submit.isPending ? "Submitting..." : "Submit request"}
									</Button>
								</div>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
