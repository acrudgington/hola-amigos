import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { config } from "./config.js";
import { logEvent } from "./db.js";

export const client = new Anthropic();

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type Tools = Parameters<typeof client.beta.messages.toolRunner>[0]["tools"];

export type AgentRun = {
  agent: string;
  /** Stable instructions. Keep volatile data (dates, ids) in messages so the prefix caches. */
  system: string;
  messages: BetaMessageParam[];
  tools?: Tools;
  effort?: Effort;
  maxIterations?: number;
};

/**
 * Run one agent turn with the SDK tool runner. Claude calls our tools until it is done.
 * - Server-side refusal fallback is on ("default"), so a classifier decline is retried on a fallback model.
 * - The system prompt is cached (it holds the full catalogue and brand voice).
 */
export async function runAgent(opts: AgentRun): Promise<{ text: string; message: BetaMessage }> {
  const runner = client.beta.messages.toolRunner({
    model: config.model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "medium" },
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    tools: opts.tools ?? [],
    messages: opts.messages,
    max_iterations: opts.maxIterations ?? 12,
  });
  const message = await runner.runUntilDone();
  if (message.stop_reason === "refusal") {
    logEvent(opts.agent, "refusal", { stop_details: message.stop_details });
    throw new Error(`${opts.agent}: request declined by safety systems`);
  }
  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  logEvent(opts.agent, "run", {
    stop_reason: message.stop_reason,
    usage: message.usage,
  });
  return { text, message };
}

/** Pull the last ```json fenced block (or bare JSON) out of a reply. */
export function extractJson<T>(text: string): T {
  const fenced = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].pop()?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as T;
}

export const webSearch = { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 4 };
export const webFetch = { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 4, max_content_tokens: 12000 };
