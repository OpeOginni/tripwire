import { useWorkspace } from "#/lib/workspace-context";
import { GithubIcon } from "#/components/icons/github";
import {
	Menu,
	MenuTrigger,
	MenuPopup,
	MenuItem,
} from "#/components/ui/menu";
import { useAuth } from '@tripwire/auth/components';
import { MenuChevronDownIcon10, SmallCheckStrokeIcon12 } from "#/components/icons/app-chrome-icons";

export function OrgSwitcher() {
	const { org, orgs, setOrg } = useWorkspace();
	const { user } = useAuth();

	if (orgs.length === 0) return null;

	return (
		<Menu>
			<MenuTrigger className="flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] bg-tw-card text-tw-text-muted hover:text-tw-text-primary transition-colors cursor-pointer">
				{org?.logo ? (
					<img src={org.logo} alt="" className="w-4 h-4 rounded-full" />
				) : (
					<div
						className="shrink-0 relative rounded-full overflow-hidden size-5 bg-cover bg-center bg-tw-card"
						style={{
							backgroundImage: user?.image
								? `url('${user.image}')`
								: "url('https://i.pravatar.cc/80?img=12')",
						}}
					/>
				)}
				<span className="text-[13px] text-tw-text-primary leading-none max-w-[120px] truncate">
					{org?.name ?? "Select org"}
				</span>
				<MenuChevronDownIcon10 className="text-tw-text-tertiary" />
			</MenuTrigger>
			<MenuPopup align="end" className="border-tw-border bg-tw-card">
				{orgs.map((o) => (
					<MenuItem
						key={o.id}
						onClick={() => setOrg(o)}
						className="flex items-center justify-between"
					>
						<span className="flex items-center gap-2">
							{o.logo ? (
								<img src={o.logo} alt="" className="w-4 h-4 rounded-full" />
							) : (
								<div
									className="shrink-0 relative rounded-full overflow-hidden size-5 bg-cover bg-center bg-tw-card"
									style={{
										backgroundImage: user?.image
											? `url('${user.image}')`
											: "url('https://i.pravatar.cc/80?img=12')",
									}}
								/>
							)}
							{o.name}
						</span>
						{org?.id === o.id && (
							<SmallCheckStrokeIcon12 className="text-tw-accent shrink-0" />
						)}
					</MenuItem>
				))}
			</MenuPopup>
		</Menu>
	);
}

export function RepoSwitcher() {
	const { repo, repos, setRepo } = useWorkspace();

	if (repos.length === 0) {
		return (
			<span className="text-[13px] text-tw-text-tertiary px-2.5 h-8 flex items-center rounded-[10px] bg-tw-card">
				No repos
			</span>
		);
	}

	return (
		<Menu>
			<MenuTrigger className="flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] bg-tw-card text-tw-text-muted hover:text-tw-text-primary transition-colors cursor-pointer">
				<GithubIcon className="w-5 h-5 text-tw-text-primary" />
				<span className="text-[13px] text-tw-text-primary leading-none max-w-[160px] truncate">
					{repo?.name ?? "Select repo"}
				</span>
				<MenuChevronDownIcon10 className="text-tw-text-tertiary" />
			</MenuTrigger>
			<MenuPopup align="end" className="border-tw-border bg-tw-card">
				{repos.map((r) => (
					<MenuItem
						key={r.id}
						onClick={() => setRepo(r)}
						className="flex items-center justify-between"
					>
						<span className="flex items-center gap-2">
							<span className="text-[12px] text-tw-text-primary">{r.fullName}</span>
						</span>
						{repo?.id === r.id && (
							<SmallCheckStrokeIcon12 className="text-tw-accent shrink-0" />
						)}
					</MenuItem>
				))}
			</MenuPopup>
		</Menu>
	);
}

export function OrgRepoSwitcher() {
	return (
		<div className="flex items-center gap-1.5">
			<OrgSwitcher />
			<RepoSwitcher />
		</div>
	);
}
