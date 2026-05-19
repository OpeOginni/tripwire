import { useState, useRef, useEffect } from "react";
import { Button } from "#/components/ui/button";
import { DropdownChevronDownIcon10 } from "#/components/icons/app-chrome-icons";

interface RuleDropdownProps {
	value: string;
	options?: string[];
	onChange?: (value: string) => void;
}

export function RuleDropdown({ value, options, onChange }: RuleDropdownProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open]);

	return (
		<span className="relative inline-flex" ref={ref} data-dropdown>
			<Button variant="ghost"
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					options && onChange && setOpen(!open);
				}}
				className="inline-flex items-center h-[22px] rounded-[10px] px-[5px] gap-2 bg-[oklch(26.4%_0_0)] border border-[#353434] cursor-pointer"
			>
				<span className="text-xs text-center text-white font-medium">
					{value}
				</span>
				<DropdownChevronDownIcon10 />
			</Button>
			{open && options && (
				<div className="absolute top-full left-0 mt-1 z-50 min-w-[80px] rounded-lg bg-[#2a2a2a] border border-[#353434] shadow-lg py-1">
					{options.map((opt) => (
						<Button variant="ghost"
							key={opt}
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onChange?.(opt);
								setOpen(false);
							}}
							className={`w-full text-left px-3 py-1.5 text-xs text-white hover:bg-[#353434] border-none bg-transparent cursor-pointer ${
								opt === value ? "font-medium" : ""
							}`}
						>
							{opt}
						</Button>
					))}
				</div>
			)}
		</span>
	);
}
