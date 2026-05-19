import { createFileRoute } from "@tanstack/react-router";
import { useWorkspace } from "#/lib/workspace-context";
import { Button } from "#/components/ui/button";
import { routes } from "#/lib/routes";
import { GitHubMarkWhiteIcon20 } from "#/components/icons/github-mark-icon";
import { SuccessCheckStrokeIcon14 } from "#/components/icons/app-chrome-icons";

export const Route = createFileRoute("/_app/$orgHandle/integrations")({
	component: IntegrationsPage,
});

function IntegrationsPage() {
	const { repos, repo, setRepo, isLoading } = useWorkspace();

	return (
		<div className="p-6 max-w-2xl mx-auto">
			<h1 className="text-xl font-semibold text-tw-text-primary mb-1">
				Integrations
			</h1>
			<p className="text-sm text-tw-text-secondary mb-6">
				Connect repositories and manage your GitHub integration.
			</p>

			{/* GitHub App Section */}
			<div className="rounded-xl p-5 mb-6">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-start gap-3">
						<div className="size-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
							<GitHubMarkWhiteIcon20 />
						</div>
						<div className="flex flex-col gap-1">
							<div className="text-[14px] font-medium text-tw-text-primary">
								{repos.length > 0 ? "Tripwire GitHub App" : "Install the Tripwire GitHub App"}
							</div>
							<div className="text-[12px] text-tw-text-muted leading-snug">
								{repos.length > 0
									? `${repos.length} repo${repos.length === 1 ? "" : "s"} connected`
									: "Connect your GitHub repositories to start protecting them from spam PRs, bot accounts, and AI-generated contributions."}
							</div>
						</div>
					</div>
					<Button
						size="xs"
						variant="outline"
						className="shrink-0 bg-white text-black border-[#CDCDCD] hover:bg-white/90"
						render={(
							<a href={routes.api.githubInstall} target="_blank" rel="noopener noreferrer">
								{repos.length > 0 ? "Manage" : "Install"}
							</a>
						)}
					/>
				</div>
			</div>

			{/* Repo Picker */}
			{repos.length > 0 && (
				<div className="rounded-xl bg-tw-card p-4">
					<div className="text-sm font-medium text-tw-text-primary mb-3">
						Select Repository
					</div>

					{isLoading ? (
						<div className="text-sm text-tw-text-muted py-4 text-center">
							Loading repositories...
						</div>
					) : (
						<div className="space-y-1">
							{repos.map((r) => {
								const isSelected = repo?.id === r.id;
								return (
									<Button variant="ghost"
										key={r.id}
										type="button"
										onClick={() => setRepo(r)}
										className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
											isSelected
												? "bg-tw-hover text-tw-text-primary"
												: "text-tw-text-secondary hover:bg-tw-hover hover:text-tw-text-primary"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="font-mono">{r.fullName}</span>
											{isSelected && (
												<SuccessCheckStrokeIcon14 className="text-tw-success" />
											)}
										</div>
									</Button>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
