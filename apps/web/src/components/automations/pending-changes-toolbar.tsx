import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	SmallPlusStrokeIcon12,
	SmallCheckStrokeIcon12,
	SmallXStrokeIcon12,
} from "#/components/icons/app-chrome-icons";
import { cn } from "@tripwire/ui/utils";

interface PendingChangesToolbarProps {
  summary: string;
  onAccept: () => void;
  onCancel: () => void;
}

export function PendingChangesToolbar({ summary, onAccept, onCancel }: PendingChangesToolbarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 z-20",
        "flex items-center gap-3 px-4 py-2.5 rounded-xl",
        "bg-tw-card/95 border border-tw-border backdrop-blur-sm shadow-lg",
        "transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center size-5 rounded-md bg-tw-accent/15">
          <SmallPlusStrokeIcon12 className="text-tw-accent" />
        </span>
        <span className="text-[13px] text-tw-text-primary font-medium">AI proposed changes</span>
      </div>

      <span className="text-[12px] text-tw-text-muted">{summary}</span>

      <div className="flex items-center gap-1.5 ml-1">
        <Button variant="ghost"
          type="button"
          onClick={onAccept}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-tw-success/15 text-tw-success text-[12px] font-medium hover:bg-tw-success/25 transition-colors"
        >
          <SmallCheckStrokeIcon12 className="text-tw-success" />
          Accept
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-tw-hover text-tw-text-muted text-[12px] font-medium hover:text-tw-text-primary hover:bg-[#FFFFFF12] transition-colors"
        >
          <SmallXStrokeIcon12 className="text-tw-text-muted" />
          Revert
        </Button>
      </div>
    </div>
  );
}
