import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@tripwire/auth/client";
import { LandingHeader } from "#/components/landing/header";
import FaultyTerminal from "#/components/landing/faulty-terminal";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	const { data: session } = authClient.useSession();

	return (
		<div className="[font-synthesis:none] flex w-full min-h-screen flex-col bg-black antialiased relative overflow-hidden">
			{/* Terminal background */}
			<div className="absolute inset-0 z-0">
				<FaultyTerminal
					scale={3.0}
					digitSize={1.2}
					scanlineIntensity={0.5}
					glitchAmount={1}
					flickerAmount={1}
					noiseAmp={1}
					chromaticAberration={0}
					dither={0}
					curvature={0.1}
					tint="#202020"
					mouseReact
					mouseStrength={0.5}
					brightness={0.6}
				/>
			</div>

			{/* Content */}
			<div className="relative z-10 flex w-full min-h-screen flex-col">
				<LandingHeader session={session} />
				<div className="flex w-full flex-1 gap-3 justify-center items-center flex-col px-4">
					<h1 className="text-tw-text-primary font-sans font-medium text-lg">
						catch slop before it catches up with you
					</h1>
					{session ? (
						<>
							<Link
								to="/home"
								className="flex items-center h-7 px-2.5 rounded-lg text-[14px] font-medium text-black bg-white shadow-sm hover:bg-white/90 transition-colors"
							>
								get started
							</Link>
						</>
					) : (
						<>
							<Link
								to="/login"
								className="flex items-center h-7 px-2.5 rounded-lg text-[14px] font-medium text-black bg-white shadow-sm hover:bg-white/90 transition-colors"
							>
								login
							</Link>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
