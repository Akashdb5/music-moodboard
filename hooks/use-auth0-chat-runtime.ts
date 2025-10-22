"use client";

import { useChat } from "@ai-sdk/react";
import { useInterruptions, type Auth0InterruptionUI } from "@auth0/ai-vercel/react";
import {
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useAISDKRuntime,
  type UseChatRuntimeOptions,
} from "@assistant-ui/react-ai-sdk";
import { useEffect, useMemo, useState } from "react";

type UseAuth0ChatRuntimeResult = {
  runtime: AssistantRuntime;
  toolInterrupt: Auth0InterruptionUI | null;
};

const useAuth0ChatThreadRuntime = (options?: UseChatRuntimeOptions) => {
  const { adapters, transport: transportOptions, ...chatOptions } = options ?? {};
  const { onError, ...restChatOptions } = chatOptions;
  const transport =
    transportOptions instanceof AssistantChatTransport
      ? transportOptions
      : transportOptions ?? new AssistantChatTransport();

  const { toolInterrupt, ...chat } = useInterruptions((errorHandler) => {
    const wrappedOnError = errorHandler(
      onError ??
        ((_error: Error) => {
          /* noop default */
        }),
    );

    return useChat({
      ...restChatOptions,
      transport,
      onError: wrappedOnError,
    });
  });

  const runtime = useAISDKRuntime(chat, { adapters });

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
  }

  return { runtime, toolInterrupt };
};

export const useAuth0ChatRuntime = ({
  cloud,
  ...options
}: UseChatRuntimeOptions = {}): UseAuth0ChatRuntimeResult => {
  const [toolInterrupt, setToolInterrupt] = useState<Auth0InterruptionUI | null>(null);
  const cloudAdapter = unstable_useCloudThreadListAdapter({ cloud });

  const runtime = unstable_useRemoteThreadListRuntime({
    adapter: cloudAdapter,
    runtimeHook: function RuntimeHook() {
      const { runtime: threadRuntime, toolInterrupt } =
        useAuth0ChatThreadRuntime(options);

      useEffect(() => {
        setToolInterrupt(toolInterrupt);
      }, [toolInterrupt]);

      return threadRuntime;
    },
  });

  return useMemo(
    () => ({
      runtime,
      toolInterrupt,
    }),
    [runtime, toolInterrupt],
  );
};
