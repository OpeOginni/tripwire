/**
 * TanStack AI ChatMiddleware that tracks token usage and reports
 * dollar-denominated spend (in cents) to Autumn after each chat completes.
 *
 * Uses tokenlens for live provider pricing via the OpenRouter catalog.
 */

import type { ChatMiddleware } from "@tanstack/ai";
import { useRequest } from "nitro/context";
import type { RequestLogger } from "evlog";
import { computeCostCents } from "./credit-schema";
import { autumn } from "#/lib/autumn";

interface CreditMiddlewareOptions {
	customerId: string;
	modelId: string;
}

export function createCreditMiddleware({
	customerId,
	modelId,
}: CreditMiddlewareOptions): ChatMiddleware {
	let totalPromptTokens = 0;
	let totalCompletionTokens = 0;

	return {
		name: "credit-tracking",

		onUsage(_ctx, usage) {
			totalPromptTokens += usage.promptTokens;
			totalCompletionTokens += usage.completionTokens;
			console.log(
				`[billing:iter] +${usage.promptTokens} in / +${usage.completionTokens} out (total: ${totalPromptTokens} in / ${totalCompletionTokens} out)`,
			);
		},

		async onFinish(ctx) {
			if (totalPromptTokens === 0 && totalCompletionTokens === 0) {
				console.log("[billing] no tokens recorded, skipping");
				logAi({ outcome: "no_tokens" });
				return;
			}

			const cents = await computeCostCents(modelId, totalPromptTokens, totalCompletionTokens);

			console.log(
				`[billing] ${modelId} | ${totalPromptTokens} input + ${totalCompletionTokens} output = ${cents}c charged`,
			);

			logAi({ outcome: "ok", costCents: cents });

			if (cents === 0) return;

			ctx.defer(
				autumn.track({
					customerId,
					featureId: "ai_credits",
					value: cents,
					properties: {
						model: modelId,
						promptTokens: totalPromptTokens,
						completionTokens: totalCompletionTokens,
					},
				}).catch((err) => {
					console.error("[billing] Failed to track usage:", err);
				}),
			);
		},
	};

	/**
	 * Attach ai.* fields to the current request's wide event so dashboards
	 * and drains can chart token usage, cost, and outcome per request.
	 */
	function logAi(extra: { outcome: "ok" | "no_tokens" | "error"; costCents?: number; error?: unknown }) {
		try {
			const req = useRequest() as { context?: { log?: RequestLogger } } | undefined;
			const log = req?.context?.log;
			if (!log) return;
			log.set({
				ai: {
					model: modelId,
					customerId,
					promptTokens: totalPromptTokens,
					completionTokens: totalCompletionTokens,
					totalTokens: totalPromptTokens + totalCompletionTokens,
					costCents: extra.costCents,
					outcome: extra.outcome,
				},
			});
			if (extra.error) {
				const err =
					extra.error instanceof Error
						? extra.error
						: new Error(String(extra.error));
				log.error(err);
			}
		} catch {
			// No active request scope (e.g. unit test) — fall through silently.
		}
	}
}
