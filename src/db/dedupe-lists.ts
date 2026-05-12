/**
 * One-shot pre-migration dedupe for whitelist_entries and blacklist_entries.
 *
 * Removes case-insensitive duplicate (repoId, githubUsername) pairs, keeping
 * the earliest createdAt row in each group. Must be run before the migration
 * that adds the unique indexes — otherwise the CREATE UNIQUE INDEX will fail
 * on any tenant that has dupes today.
 *
 * Idempotent: running it twice is a no-op once dedupe is complete.
 *
 * Usage:
 *   pnpm exec tsx src/db/dedupe-lists.ts
 */

import { sql } from "drizzle-orm";

import { db } from "./index.ts";

async function dedupeTable(table: "whitelist_entries" | "blacklist_entries"): Promise<number> {
	// Identify the canonical "keeper" row per (repo_id, lower(github_username))
	// group: the one with the minimum (created_at, id) tuple. Delete the rest.
	const result = await db.execute(sql`
		WITH ranked AS (
			SELECT
				id,
				row_number() OVER (
					PARTITION BY repo_id, lower(github_username)
					ORDER BY created_at ASC, id ASC
				) AS rn
			FROM ${sql.identifier(table)}
		)
		DELETE FROM ${sql.identifier(table)}
		WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
	`);

	// node-postgres returns { rowCount } on its result object.
	const rowCount =
		typeof (result as { rowCount?: number | null }).rowCount === "number"
			? ((result as { rowCount: number }).rowCount ?? 0)
			: 0;
	return rowCount;
}

async function main(): Promise<void> {
	const whitelistRemoved = await dedupeTable("whitelist_entries");
	console.log(`removed ${whitelistRemoved} duplicate whitelist rows`);

	const blacklistRemoved = await dedupeTable("blacklist_entries");
	console.log(`removed ${blacklistRemoved} duplicate blacklist rows`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("dedupe-lists failed:", err);
		process.exit(1);
	});
