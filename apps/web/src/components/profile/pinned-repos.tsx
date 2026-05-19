import type { PinnedRepo } from "@tripwire/github";
import { RepoStarIcon12, RepoForkNetworkIcon11 } from "#/components/icons/github-repo-meta-icons";

export function PinnedRepoCard({ repo }: { repo: PinnedRepo }) {
	return (
		<a
			href={repo.url}
			target="_blank"
			rel="noreferrer"
			className="flex flex-col justify-between gap-1 rounded-lg bg-tw-inner px-3.5 py-2.5 transition-opacity hover:opacity-80"
		>
			<div>
				<div className="text-[13px] font-medium text-tw-text-primary truncate">
					{repo.name}
				</div>
				{repo.description && (
					<p className="text-[11px] text-tw-text-tertiary mt-0.5 line-clamp-2 leading-snug m-0">
						{repo.description}
					</p>
				)}
			</div>
			<div className="flex items-center gap-3 text-[11px] text-tw-text-tertiary mt-2">
				{repo.primaryLanguage && (
					<span className="flex items-center gap-1">
						<span
							className="inline-block w-2.5 h-2.5 rounded-full"
							style={{ backgroundColor: repo.primaryLanguage.color ?? "currentColor" }}
						/>
						{repo.primaryLanguage.name}
					</span>
				)}
				{repo.stars > 0 && (
					<span className="flex items-center gap-0.5">
						<RepoStarIcon12 />
						{repo.stars}
					</span>
				)}
				{repo.forks > 0 && (
					<span className="flex items-center gap-0.5">
						<RepoForkNetworkIcon11 />
						{repo.forks}
					</span>
				)}
			</div>
		</a>
	);
}

export function PinnedRepos({ repos }: { repos: PinnedRepo[] }) {
	if (repos.length === 0) return null;
	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{repos.map((repo) => (
				<PinnedRepoCard key={repo.id} repo={repo} />
			))}
		</div>
	);
}
