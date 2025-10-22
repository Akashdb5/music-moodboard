"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "@/components/auth/user-nav";
import { EnsureAPIAccessPopup } from "@/components/assistant-ui/ensure-api-access-popup";
import { useAuth0ChatRuntime } from "@/hooks/use-auth0-chat-runtime";
import {
  SPOTIFY_CONNECTION,
  SPOTIFY_SCOPES,
} from "@/lib/spotify-config";

type AssistantProps = {
  auth0Domain: string;
  auth0ClientId: string;
};

export const Assistant = ({ auth0Domain, auth0ClientId }: AssistantProps) => {
  const { runtime, toolInterrupt } = useAuth0ChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
         
              </div>
              <UserNav />
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
        {toolInterrupt && toolInterrupt.code === "TokenVaultError" && (
          <EnsureAPIAccessPopup
            interrupt={toolInterrupt}
            connectWidget={{
              title: "Access your Spotify playlists",
              description:
                "Connect your Spotify account so the assistant can list your playlists.",
              action: { label: "Connect" },
            }}
            connection={SPOTIFY_CONNECTION}
            scopes={SPOTIFY_SCOPES}
            auth0Domain={auth0Domain}
            auth0ClientId={auth0ClientId}
          />
        )}
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
