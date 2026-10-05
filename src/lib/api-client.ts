"use client";

import { useSettings } from "./store";

/** Browser-side API helpers. Errors always surface as ApiClientError with a user-readable message. */

export class ApiClientError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const STREAM_ERROR = /<<<ERROR (\w+)>>>/;

function headers(): HeadersInit {
  const key = useSettings.getState().geminiKey;
  return { "Content-Type": "application/json", ...(key ? { "x-gemini-key": key } : {}) };
}

async function toError(res: Response): Promise<ApiClientError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return new ApiClientError(body.error?.code ?? "HTTP_" + res.status, body.error?.message ?? `Request failed (${res.status}).`);
  } catch {
    return new ApiClientError("HTTP_" + res.status, `Request failed (${res.status}).`);
  }
}

async function send(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: headers(), body: JSON.stringify(body), signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiClientError("NETWORK", "Network error — check your connection and try again.");
  }
  if (!res.ok) throw await toError(res);
  return res;
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await send(path, body, signal);
  return (await res.json()) as T;
}

/** Streams a text response, calling onText with the full accumulated text after every chunk. */
export async function postStream(path: string, body: unknown, onText: (fullText: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await send(path, body, signal);
  if (!res.body) throw new ApiClientError("NO_BODY", "Empty response from server.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const err = full.match(STREAM_ERROR);
    if (err) throw new ApiClientError(err[1], streamErrorMessage(err[1]));
    onText(full);
  }
  return full;
}

function streamErrorMessage(code: string): string {
  if (code === "RATE_LIMIT") return "Gemini free-tier rate limit reached mid-stream. Wait a minute and retry.";
  return "The AI stream was interrupted. Please retry.";
}

export async function getStatus(): Promise<{ aiEnabled: boolean }> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    return (await res.json()) as { aiEnabled: boolean };
  } catch {
    return { aiEnabled: false };
  }
}
