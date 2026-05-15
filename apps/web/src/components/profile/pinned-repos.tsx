import type { PinnedRepo } from "@tripwire/github";

export function PinnedRepoCard({ repo }: { repo: PinnedRepo }) {
	return (
		<a
			href={repo.url}
			target="_blank"
			rel="noreferrer"
			className="flex flex-col justify-between gap-1 rounded-lg bg-tw-inner px-3.5 py-2.5 transition-colors hover:bg-tw-hover"
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
						<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
							<path d="M6 1l1.5 3.1L11 4.5 8.5 7l.6 3.5L6 8.8 2.9 10.5l.6-3.5L1 4.5l3.5-.4L6 1z" />
						</svg>
						{repo.stars}
					</span>
				)}
				{repo.forks > 0 && (
					<span className="flex items-center gap-0.5">
						<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="6" cy="6" r="2.5" />
							<circle cx="12" cy="18" r="2.5" />
							<circle cx="18" cy="6" r="2.5" />
							<path d="M6 8.5v2c0 2 1.5 3 6 3s6-1 6-3v-2" strokeLinecap="round" />
							<path d="M12 13.5v2" strokeLinecap="round" />
						</svg>
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
