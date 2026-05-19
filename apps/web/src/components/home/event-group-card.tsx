import type { KeyboardEvent, MouseEvent } from "react";
import { Button } from "#/components/ui/button";
import {
	EventAlertTriangleIcon,
	EventCloseCircleSolidIcon,
	EventPauseHourglassIcon,
} from "#/components/icons/event-group-status-icons";
import type { TripwireEvent, User } from "#/types/home";

interface EventGroupCardProps {
	group: {
		key: string;
		items: TripwireEvent[];
	};
	onOpenEvent?: (event: TripwireEvent) => void;
}

function getUser(username: string): User {
	return {
		username,
		name: username,
		avatar: `https://github.com/${username}.png`,
		accountAge: "Unknown",
		publicRepos: 0,
		followers: 0,
		mergedPrs: 0,
		readme: false,
		tint: "#888",
	};
}

export function EventGroupCard({ group, onOpenEvent }: EventGroupCardProps) {
	const first = group.items[0];
	const users = group.items.flatMap((e) => e.users);

	const handleAction = (ev: MouseEvent | KeyboardEvent) => {
		ev.stopPropagation();
		onOpenEvent?.(first);
	};

	const handleActionKeyDown = (ev: KeyboardEvent<HTMLSpanElement>) => {
		if (ev.key === "Enter" || ev.key === " ") {
			ev.preventDefault();
			handleAction(ev);
		}
	};

	return (
		<div className="flex flex-col relative rounded-xl overflow-hidden gap-[3px] w-full bg-tw-card p-1">
			<Button variant="ghost"
				onClick={() => onOpenEvent?.(first)}
				type="button"
				className="rounded-[10px] text-left group focus:outline-none cursor-pointer"
			>
				<div className="flex flex-col rounded-[10px] gap-1 bg-tw-inner group-hover:bg-[#FAFAFA26] transition-colors p-2">
					{users.length === 1 && first.preview ? (
						<SingleUserPreview user={getUser(users[0])} preview={first.preview} />
					) : (
						<MultiUserRow userKeys={users} />
					)}
				</div>
			</Button>

			<div className="rounded-xl">
				<div className="flex items-center gap-3 justify-between p-1">
					<div className="flex items-center min-w-0 relative px-1.5 gap-2">
						<EventAlertTriangleIcon
							color={first.severity === "warning" ? "#D1BC00" : first.severity === "success" ? "#67E19F" : "#F56D5D"}
						/>
						<span className="shrink-0 text-[14px] leading-[22px] text-tw-text-primary whitespace-nowrap">
							{first.title}
						</span>
					</div>
					{first.action ? (
						<span
							role="button"
							tabIndex={0}
							onClick={handleAction}
							onKeyDown={handleActionKeyDown}
							aria-label={first.action.label}
							className="flex items-center h-8 shrink-0 px-2.5 rounded-[10px] justify-center gap-1.5 bg-[#363639] hover:bg-[#404044] transition-colors whitespace-nowrap text-tw-text-primary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-tw-text-primary"
						>
							{first.action.kind === "close" ? <EventCloseCircleSolidIcon /> : first.action.kind === "pause" ? <EventPauseHourglassIcon /> : null}
							<span className="text-[13px] leading-none text-center text-tw-text-primary">{first.action.label}</span>
						</span>
					) : null}
				</div>
			</div>
		</div>
	);
}

interface SingleUserPreviewProps {
	user: User;
	preview: string;
}

function SingleUserPreview({ user, preview }: SingleUserPreviewProps) {
	const [head, rest] = (() => {
		if (preview.includes("Payout")) {
			return [preview.split(" Payout")[0], "Payout" + preview.split(" Payout")[1]];
		}
		return [preview, ""];
	})();

	return (
		<div className="flex gap-1">
			<div
				className="items-center flex h-[25px] justify-center min-w-4 w-[25px] overflow-hidden rounded-full shrink-0 bg-cover bg-center"
				style={{ backgroundImage: `url('${user.avatar}')` }}
			/>
			<div className="flex items-start basis-0 grow gap-2 min-w-0">
				<div className="basis-0 grow min-w-0">
					<div>
						<div className="inline-flex">
							<div className="flex items-center rounded-lg py-[1px] px-1 gap-1">
								<span className="text-[14px] leading-5 text-tw-text-primary">{user.username}</span>
							</div>
						</div>
						<div className="inline-block text-[14px] leading-[25px] text-tw-text-secondary whitespace-pre-wrap">
							{head}
							{rest ? (
								<>
									{" "}
									<span className="text-tw-text-secondary">Payout wallets:</span>
									{"  "}
									<span className="font-mono text-tw-text-secondary">{rest.replace(/^Payout wallets:\s*/, "")}</span>
								</>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

interface MultiUserRowProps {
	userKeys: string[];
}

function MultiUserRow({ userKeys }: MultiUserRowProps) {
	const uniqueKeys = [...new Set(userKeys)];

	return (
		<div className="flex gap-1 items-center">
			<div className="flex items-center gap-[5px]">
				{uniqueKeys.slice(0, 6).map((username, index) => {
					const user = getUser(username);
					return (
						<div key={`${username}-${index}`} className="flex items-center gap-0">
							<div
								className="w-[18px] h-[18px] rounded-full bg-cover bg-center shrink-0"
								style={{ backgroundImage: `url('${user.avatar}')` }}
							/>
							<div className="h-5 relative shrink-0">
								<span className="left-[2px] top-0 absolute text-[14px] leading-5 text-tw-text-primary whitespace-nowrap">
									{user.username}
								</span>
								<span className="invisible text-[14px] leading-5 px-[2px]">{user.username}</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
