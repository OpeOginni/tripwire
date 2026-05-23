export interface TokenBucketOptions {
  capacity: number
  refillPerSecond: number
}

export interface TokenBucket {
  acquire(count?: number): Promise<void>
  available(): number
}

export function createTokenBucket(opts: TokenBucketOptions): TokenBucket {
  let tokens = opts.capacity
  let lastRefill = Date.now()

  function refill() {
    const now = Date.now()
    const elapsed = (now - lastRefill) / 1000
    if (elapsed <= 0) return
    tokens = Math.min(opts.capacity, tokens + elapsed * opts.refillPerSecond)
    lastRefill = now
  }

  return {
    async acquire(count = 1) {
      if (count > opts.capacity) {
        throw new Error(
          `cannot acquire ${count} tokens — bucket capacity is ${opts.capacity}`
        )
      }
      refill()
      while (tokens < count) {
        const deficit = count - tokens
        const waitMs = Math.ceil((deficit / opts.refillPerSecond) * 1000)
        await sleep(Math.min(waitMs, 1000))
        refill()
      }
      tokens -= count
    },
    available() {
      refill()
      return tokens
    },
  }
}

/** Sized for the GitHub 5,000 req/hr/token cap. Tokens are individual requests. */
export function githubBucket(): TokenBucket {
  return createTokenBucket({ capacity: 5000, refillPerSecond: 5000 / 3600 })
}

/** Approximate REST + GraphQL calls one `processContributor` run makes. */
export const GH_CALLS_PER_CONTRIBUTOR = 12

export async function withBucket<T>(
  bucket: TokenBucket,
  fn: () => Promise<T>,
  count = 1
): Promise<T> {
  await bucket.acquire(count)
  return fn()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
