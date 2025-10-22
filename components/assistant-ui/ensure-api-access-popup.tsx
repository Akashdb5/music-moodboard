"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Auth0InterruptionUI } from "@auth0/ai-vercel/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConnectWidgetCopy = {
  title: string;
  description?: string;
  action?: { label: string };
};

type EnsureAPIAccessPopupProps = {
  interrupt: Auth0InterruptionUI;
  connectWidget: ConnectWidgetCopy;
  auth0Domain: string;
  auth0ClientId: string;
  connection: string;
  scopes: ReadonlyArray<string>;
};

const buildAuthorizeUrl = ({
  domain,
  clientId,
  connection,
  scopes,
  redirectUri,
}: {
  domain: string;
  clientId: string;
  connection: string;
  scopes: ReadonlyArray<string>;
  redirectUri: string;
}) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    prompt: "consent",
    connection,
    scope: ["openid", "offline_access", ...scopes].join(" "),
  });

  return `https://${domain}/authorize?${params.toString()}`;
};

export const EnsureAPIAccessPopup = ({
  interrupt,
  connectWidget,
  auth0Domain,
  auth0ClientId,
  connection,
  scopes,
}: EnsureAPIAccessPopupProps) => {
  const [open, setOpen] = useState(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setOpen(true);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [interrupt]);

  const authorizeUrl = useMemo(() => {
    if (!auth0Domain || !auth0ClientId || typeof window === "undefined") {
      return null;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback`;
    return buildAuthorizeUrl({
      domain: auth0Domain,
      clientId: auth0ClientId,
      connection,
      scopes,
      redirectUri,
    });
  }, [auth0ClientId, auth0Domain, connection, scopes]);

  const handleConnect = () => {
    if (!authorizeUrl) {
      console.warn("Missing Auth0 configuration for Token Vault connection.");
      return;
    }

    const popup = window.open(
      authorizeUrl,
      "auth0-token-vault-connect",
      "width=480,height=720",
    );

    if (!popup) {
      console.warn("Failed to open connection window. Check popup blockers.");
      return;
    }

    timerRef.current = window.setInterval(() => {
      if (popup.closed) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        interrupt.resume();
        setOpen(false);
      }
    }, 500);
  };

  const handleDismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{connectWidget.title}</DialogTitle>
          {connectWidget.description && (
            <DialogDescription>{connectWidget.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            Not now
          </Button>
          <Button onClick={handleConnect} disabled={!authorizeUrl}>
            {connectWidget.action?.label ?? "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
