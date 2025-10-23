import * as React from "react";
import { Github, Key, Layers, MessagesSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const securityHighlights = [
  {
    title: "Authenticated chat runtime",
    description:
      "Every call to /api/chat resolves the Auth0 session before the agent runs, so only signed-in users can prompt or receive answers.",
    icon: ShieldCheck,
  },
  {
    title: "Token Vault-governed tools",
    description:
      "Spotify actions run through Auth0 Token Vault helpers and surface a consent popup, ensuring the agent uses the user's scoped credentials only after approval.",
    icon: Key,
  },
  {
    title: "Authorized RAG context",
    description:
      "Knowledge retrieval pipes documents through FGA filters, returning only snippets the caller is allowed to see before generating an answer.",
    icon: Layers,
  },
];

export function ThreadListSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header mb-2 border-b">
        <div className="aui-sidebar-header-content flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link
                  href="https://assistant-ui.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="aui-sidebar-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <MessagesSquare className="aui-sidebar-header-icon size-4" />
                  </div>
                  <div className="aui-sidebar-header-heading mr-6 flex flex-col gap-0.5 leading-none">
                    <span className="aui-sidebar-header-title font-semibold">
                      Music Moodboard
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent className="aui-sidebar-content flex flex-col gap-4 px-2 pb-4 pt-2">
        <section className="aui-sidebar-overview rounded-xl border border-sidebar-border bg-sidebar p-4 text-xs leading-relaxed shadow-sm md:text-sm">
          <h2 className="aui-sidebar-overview-title text-sm font-semibold text-sidebar-foreground md:text-base">
            Securing Music Moodboard
          </h2>
          <br />
          <ul className="aui-sidebar-overview-list mt-3 flex flex-col gap-2">
            {securityHighlights.map(({ title, description, icon: Icon }) => (
              <li
                key={title}
                className="aui-sidebar-overview-item flex items-start gap-3 rounded-lg border border-sidebar-border/80 bg-sidebar/50 p-2.5"
              >
                <span className="aui-sidebar-overview-icon flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/10 text-sidebar-primary">
                  <Icon className="size-4" />
                </span>
                <div className="aui-sidebar-overview-text space-y-1">
                  <p className="aui-sidebar-overview-heading text-xs font-medium uppercase tracking-wide text-sidebar-foreground/80 md:text-sm">
                    {title}
                  </p>
                  <p className="aui-sidebar-overview-description text-[0.72rem] text-sidebar-foreground/70 md:text-xs">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter className="aui-sidebar-footer border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="https://github.com/Akashdb5/music-moodboard"
                target="_blank"
              >
                <div className="aui-sidebar-footer-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Github className="aui-sidebar-footer-icon size-4" />
                </div>
                <div className="aui-sidebar-footer-heading flex flex-col gap-0.5 leading-none">
                  <span className="aui-sidebar-footer-title font-semibold">
                    GitHub
                  </span>
                  <span>View Source</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
