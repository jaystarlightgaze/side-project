"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";

import type { ChatMessage } from "@/features/chat";
import {
  clearChecks,
  forecastSignature,
  parseSavedChecks,
  parseSavedInput,
  readChecksRaw,
  saveChecks,
  saveInput,
  STORAGE_KEY,
  subscribeChecks,
  type ForecastInput,
} from "@/features/forecast";

import type { HomeSession } from "./session";

/** What a signed-in user's account already holds. null means signed out. */
export type AccountState = { input: ForecastInput | null; today: HomeSession | null } | null;

export type ForecastState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; session: HomeSession; key: number }
  | { status: "error" };

type Flow = {
  signedIn: boolean;
  /** undefined until this browser's saved input is read, null when there is none. */
  input: ForecastInput | null | undefined;
  state: ForecastState;
  /** Today's conversation, kept while moving between /today and /today/chat. */
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  /** Today's to-do checks, kept while moving between pages. */
  checked: boolean[];
  setChecked: (checked: boolean[]) => void;
  requestForecast: (input: ForecastInput) => void;
  retry: () => void;
};

const FlowContext = createContext<Flow | null>(null);

const subscribe = () => () => {};

/** Today's important task is told on the day; a saved one never carries over to a new forecast or the form. */
export function freshDay(input: ForecastInput): ForecastInput {
  return { ...input, importantTask: "" };
}

/**
 * State shared by /setup, /today and /today/chat. It lives in their layout, so it survives
 * in-app navigation and is gone on reload, which is all a signed-out visitor keeps.
 */
export function ForecastFlowProvider({ account, children }: { account: AccountState; children: ReactNode }) {
  // undefined on the server, string | null in the browser.
  const saved = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => undefined,
  );
  const [lastInput, setLastInput] = useState<ForecastInput | null>(null);
  const [state, setState] = useState<ForecastState>(
    account?.today ? { status: "success", session: account.today, key: 0 } : { status: "idle" },
  );
  const [messages, setMessages] = useState<ChatMessage[]>(account?.today?.messages ?? []);
  // Checks live in this browser, keyed to the forecast they were made on (see features/forecast/checks.ts).
  const savedChecks = useSyncExternalStore(subscribeChecks, readChecksRaw, () => null);
  const signature = state.status === "success" ? forecastSignature(state.session.forecast) : null;
  const checked = signature ? parseSavedChecks(savedChecks, signature) : [];
  const setChecked = (next: boolean[]) => {
    if (signature) saveChecks(signature, next);
  };

  const input =
    lastInput ?? (account ? account.input : saved === undefined ? undefined : saved === null ? null : parseSavedInput(saved));

  async function requestForecast(next: ForecastInput) {
    // Signed-in users keep their input in the account, not in this browser.
    if (!account) saveInput(next);
    setLastInput(next);
    setState({ status: "loading" });
    setMessages([]);
    clearChecks();
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(`forecast ${res.status}`);
      const session: HomeSession = await res.json();
      setMessages(session.messages);
      setState({ status: "success", session, key: Date.now() });
    } catch {
      setState({ status: "error" });
    }
  }

  const flow: Flow = {
    signedIn: account !== null,
    input,
    state,
    messages,
    setMessages,
    checked,
    setChecked,
    requestForecast: (next) => void requestForecast(next),
    retry: () => lastInput && void requestForecast(lastInput),
  };

  return <FlowContext.Provider value={flow}>{children}</FlowContext.Provider>;
}

export function useForecastFlow(): Flow {
  const flow = useContext(FlowContext);
  if (!flow) throw new Error("useForecastFlow needs ForecastFlowProvider");
  return flow;
}
