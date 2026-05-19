import { DrizzleProvider } from "@ai-sdk-tools/memory/drizzle"
import { db } from "@tripwire/db/client"
import { workingMemory, conversationMessages } from "@tripwire/db"

export const memoryProvider = new DrizzleProvider(db, {
  workingMemoryTable: workingMemory,
  messagesTable: conversationMessages,
})
