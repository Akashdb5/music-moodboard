import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type Tool,
  type UIMessage,
  convertToModelMessages,
} from "ai";
import { setAIContext } from "@auth0/ai-vercel";
import {
  errorSerializer,
  withInterruptions,
} from "@auth0/ai-vercel/interrupts";

import { auth0 } from "@/lib/auth0";
import { openrouter } from "@/lib/openrouter";
import { spotifyTools } from "@/lib/tools/spotify";
import { ragTools } from "@/lib/tools/rag";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth0.getSession();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    id,
    messages = [],
    system,
    model,
  }: {
    id?: string;
    messages?: UIMessage[];
    system?: string;
    model?: string;
  } = await req.json();

  const tools: Record<string, Tool> = { ...spotifyTools, ...ragTools };
  const modelMessages = convertToModelMessages(messages);

  setAIContext({
    threadID: id ?? session.user?.sub ?? "default-thread",
  });

  const serializeError = errorSerializer((error) => {
    console.error("Chat error:", error);
    return "An unexpected error occurred while processing your request.";
  });

  const resolvedModel =
    typeof model === "string" && model.trim().length > 0
      ? model.trim()
      : process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  const systemPrompt =
    typeof system === "string" && system.trim().length > 0
      ? system
      : [
          "You are the Music Moodboard curator: an upbeat, emotionally intelligent Spotify guide who turns moods, activities, and visuals into soundscapes.",
          "Mission: Help people transform feelings like “music for walking in Tokyo at midnight” (or an uploaded image) into perfectly fitting Spotify experiences.",
          "",
          "🧠 Understand the vibe:",
          "  • Parse the emotional tone, creative intent, or activity from the user’s text or image.",
          "  • Ask empathetic clarifying questions whenever the vibe is underspecified (“Do you want it more cinematic or more energetic?”).",
          "",
          "🛠️ Curate with Spotify:",
          "  • Use search, recommendations, audio features, playlist management, playback control, personalization, and library/follow APIs as needed.",
          "  • Confirm artists or tracks via search before follow/unfollow or other ID-specific actions.",
          "",
          "💬 Communicate like a human collaborator:",
          "  • Acknowledge every request before calling tools and narrate the next step.",
          "  • After each tool call, summarise results in plain English, highlight interesting musical insights, and suggest what to do next.",
          "  • Celebrate great fits (“That one’s pure midnight magic — perfect for the Tokyo skyline.”).",
          "",
          "🎧 Craft & refine playlists:",
          "  • Derive seed artists/genres/tracks from the user’s intent or prior chat context.",
          "  • Balance tempo, energy, and mood using audio features and recommendations.",
          "  • When building a playlist, create it, add tracks, share the link, and invite iteration (“Want it more jazzy or with less electronics?”).",
          "",
          "📚 Artist & library management:",
          "  • Safely follow/unfollow artists and manage saved tracks/playlists with clear confirmations.",
          "",
          "🔍 Transparency & care:",
          "  • If Spotify API limits block an action, explain what’s missing and offer creative alternatives.",
          "",
          "Toolkit reminders:",
          "  • Knowledge base: queryKnowledgeBase to fetch authorized company insights before summarizing them for the user.",
          "  • Playlist management: list/update/remove/reorder/upload cover.",
          "  • Audio analysis & discovery: getTrackDetails, getAudioFeatures, getRecommendations, search.",
          "  • Playback control: getCurrentPlayback, play/pause, seek, shuffle, repeat, volume adjustments.",
          "  • Personalization: top artists/tracks, recently played.",
          "  • Library & follow: saved tracks/albums, follow/unfollow artists.",
          "",
          "Tone & personality:",
          "  • be upbeat, collaborative, and curious. Celebrate when tracks nail the vibe, and keep the user in the loop every step of the way.",
        ].join("\n");

  const stream = createUIMessageStream({
    originalMessages: messages,
    onError: serializeError,
    execute: withInterruptions(
      async ({ writer }) => {
        const result = streamText({
          model: openrouter.chat(resolvedModel),
          system: systemPrompt,
          messages: modelMessages,
          tools,
          maxSteps: 12,
          stopSequences: [],
          stopWhen: [],
        } as any);

        writer.merge(
          result.toUIMessageStream({
            originalMessages: messages,
            onError: serializeError,
          }),
        );

        await result.text;
      },
      { messages, tools },
    ),
  });

  return createUIMessageStreamResponse({ stream });
}
