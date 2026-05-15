import { Link } from "@tanstack/react-router";
import type { AuthClientSession } from "@tripwire/auth/client";
import { TripwireLogo } from "#/components/icons/tripwire-logo";

export function LandingHeader({ session }: { session: AuthClientSession }) {
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
                <TripwireLogo className="w-5 h-5 text-white" />
                <span className="text-md font-medium text-tw-text-secondary font-['Geist',system-ui,sans-serif]">
                    tripwire
                </span>
            </div>
            <div className="flex items-center gap-3.5">
                {session ? (
                    <>
                        <span className="text-[14px] text-tw-text-secondary">
                            Welcome back
                        </span>
                        <Link
                            to="/home"
                            className="flex items-center h-7 px-2.5 rounded-lg text-[14px] font-medium text-black bg-white shadow-sm hover:bg-white/90 transition-colors"
                        >
                            dashboard
                        </Link>
                    </>
                ) : (
                    <>
                        <span className="text-[14px] text-tw-text-secondary">
                            Already have access?
                        </span>
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
    );
}