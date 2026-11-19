import type { SupabaseClient } from "@supabase/supabase-js";

import type { ForecastInput, ForecastMemory, ForecastResult } from "@/features/forecast/server";

import { daysBefore, MEMORY_WINDOW_DAYS, pickRecallGrade, recallQuestion } from "./recall";

// All queries run as the signed-in user; row level security keeps them to that user's rows.

export type StoredMessage = { role: "user" | "assistant"; content: string };

export type TodaySession = {
  forecastId: string;
  forecast: ForecastResult;
  messages: StoredMessage[];
  /** The conversation so far is only the forecaster's question about the past forecast. */
  recallPending: boolean;
};

export async function loadInput(supabase: SupabaseClient): Promise<ForecastInput | null> {
  const { data, error } = await supabase.from("forecast_inputs").select("input").maybeSingle();
  if (error) throw error;
  return (data?.input as ForecastInput | undefined) ?? null;
}

export async function saveInput(supabase: SupabaseClient, userId: string, input: ForecastInput) {
  const { error } = await supabase
    .from("forecast_inputs")
    .upsert({ user_id: userId, input, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Most recent recollection answered within the memory window, as of `today`. */
export async function latestMemory(supabase: SupabaseClient, today: string): Promise<ForecastMemory | null> {
  const { data, error } = await supabase
    .from("recollections")
    .select("about_date, about_grade, answer")
    .gte("answered_on", daysBefore(today, MEMORY_WINDOW_DAYS))
    .order("answered_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { date: data.about_date, grade: data.about_grade, answer: data.answer } : null;
}

type PastForecast = { id: string; date: string; grade: string };

/** The last forecast of the most recent day before today. */
async function pastForecast(supabase: SupabaseClient, today: string): Promise<PastForecast | null> {
  const { data, error } = await supabase
    .from("forecasts")
    .select("id, forecast_date, result")
    .lt("forecast_date", today)
    .order("forecast_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, date: data.forecast_date, grade: pickRecallGrade(data.result as ForecastResult) };
}

async function answeredToday(supabase: SupabaseClient, today: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("recollections")
    .select("id", { count: "exact", head: true })
    .eq("answered_on", today);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Past forecast to ask about today, or null when there is none or it was already answered today. */
export async function pendingRecall(supabase: SupabaseClient, today: string): Promise<PastForecast | null> {
  const [past, answered] = await Promise.all([pastForecast(supabase, today), answeredToday(supabase, today)]);
  return past && !answered ? past : null;
}

/** Saves today's forecast and, when due, opens its chat with the fixed recall question. */
export async function saveForecast(
  supabase: SupabaseClient,
  today: string,
  input: ForecastInput,
  forecast: ForecastResult,
): Promise<Omit<TodaySession, "forecast">> {
  const { data, error } = await supabase
    .from("forecasts")
    .insert({ forecast_date: today, input, result: forecast })
    .select("id")
    .single();
  if (error) throw error;

  const recall = await pendingRecall(supabase, today);
  if (!recall) return { forecastId: data.id, messages: [], recallPending: false };

  const question: StoredMessage = { role: "assistant", content: recallQuestion(recall.date, recall.grade) };
  const { error: messageError } = await supabase
    .from("chat_messages")
    .insert({ forecast_id: data.id, ...question, kind: "recall_question" });
  if (messageError) throw messageError;
  return { forecastId: data.id, messages: [question], recallPending: true };
}

/** Today's latest forecast with its conversation, for showing it again on any device. */
export async function loadToday(supabase: SupabaseClient, today: string): Promise<TodaySession | null> {
  const { data, error } = await supabase
    .from("forecasts")
    .select("id, result, chat_messages(role, content, kind, created_at)")
    .eq("forecast_date", today)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "chat_messages", ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const rows = data.chat_messages as (StoredMessage & { kind: string })[];
  return {
    forecastId: data.id,
    forecast: data.result as ForecastResult,
    messages: rows.map(({ role, content }) => ({ role, content })),
    recallPending: rows.length === 1 && rows[0].kind === "recall_question",
  };
}

export async function saveMessages(supabase: SupabaseClient, forecastId: string, messages: StoredMessage[]) {
  const { error } = await supabase
    .from("chat_messages")
    .insert(messages.map((message) => ({ forecast_id: forecastId, ...message })));
  if (error) throw error;
}

/** Records the user's answer to today's recall question, if one is still due. */
export async function saveRecollection(supabase: SupabaseClient, today: string, answer: string) {
  const recall = await pendingRecall(supabase, today);
  if (!recall) return;
  const { error } = await supabase.from("recollections").insert({
    forecast_id: recall.id,
    about_date: recall.date,
    about_grade: recall.grade,
    answer,
    answered_on: today,
  });
  if (error) throw error;
}
