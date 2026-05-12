import { z } from "zod";

const ruleActionSchema = z.enum(["block", "warn", "log", "threshold"]);

const ruleBaseSchema = z.object({
	enabled: z.boolean(),
	action: ruleActionSchema.default("block"),
	thresholdCount: z.number().int().min(1).optional(),
});

const honeypotPhraseSchema = z.object({
	kind: z.enum(["codeword", "marker", "natural", "tag"]),
	phrase: z.string().min(1),
});

export const ruleConfigSchema = z.object({
	aiSlopDetection: ruleBaseSchema,
	languageRequirement: ruleBaseSchema.extend({
		language: z.string(),
	}),
	minMergedPrs: ruleBaseSchema.extend({ count: z.number().int().min(0) }),
	accountAge: ruleBaseSchema.extend({ days: z.number().int().min(0) }),
	maxPrsPerDay: ruleBaseSchema.extend({ limit: z.number().int().min(1) }),
	maxFilesChanged: ruleBaseSchema.extend({ limit: z.number().int().min(1) }),
	repoActivityMinimum: ruleBaseSchema.extend({ minRepos: z.number().int().min(1) }),
	requireProfileReadme: ruleBaseSchema,
	cryptoAddressDetection: ruleBaseSchema,
	vouchedUsersOnly: ruleBaseSchema,
	aiHoneypot: ruleBaseSchema,
	contentScope: z.object({
		pullRequests: z.boolean(),
		issues: z.boolean(),
		comments: z.boolean(),
	}),
	repoFiles: z.object({
		rulesMd: z.object({
			autoSync: z.boolean(),
			customContent: z.string(),
		}),
		prTemplate: z.object({
			autoSync: z.boolean(),
			honeypotEnabled: z.boolean(),
			honeypotPhrases: z.array(honeypotPhraseSchema),
			customContent: z.string(),
		}),
	}),
});
