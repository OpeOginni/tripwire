import { createCached } from "@ai-sdk-tools/cache"

export const cached = process.env.UPSTASH_REDIS_REST_URL
  ? createCached({
      keyPrefix: "tw-tools:",
      ttl: 60 * 60 * 1000,
    })
  : createCached({
      ttl: 5 * 60 * 1000,
      debug: process.env.NODE_ENV !== "production",
    })
