import type { ChatMessage } from "@/features/chat";
import type { ForecastResult } from "@/features/forecast";

/** A forecast on screen with its conversation. forecastId is set only when it is saved to an account. */
export type HomeSession = {
  forecast: ForecastResult;
  forecastId: string | null;
  messages: ChatMessage[];
  recallPending: boolean;
};
