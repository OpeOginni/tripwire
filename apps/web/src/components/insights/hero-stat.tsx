import { HeroStatSparklineGraphic } from "#/components/icons/hero-stat-sparkline-graphic";

interface HeroStatProps {
	value: number;
}

export function HeroStat({ value }: HeroStatProps) {
	return (
		<div className="relative rounded-2xl pt-2.5 pb-2 overflow-clip w-full bg-tw-card border border-[#0000000F] shadow-[#0000000A_0px_0px_2px,#0000000A_0px_0px_1px] px-4">
			<div className="flex items-center pb-1 gap-0.5">
				<span className="tracking-[-0.2px] text-tw-text-secondary font-[520] text-[13px] leading-4 font-['Inter',system-ui,sans-serif]">
					Slop prevented
				</span>
			</div>
			<div className="flex items-end flex-wrap gap-1">
				<span className="text-[30px] leading-[36px] text-[#FFFFFFCC] font-semibold font-['Inter',system-ui,sans-serif]">
					{value}
				</span>
			</div>
			{/* Sparkline */}
			<div className="absolute right-0 w-1/3 inset-y-0 flex items-center justify-center">
				<HeroStatSparklineGraphic className="w-full h-full" />
			</div>
		</div>
	);
}
