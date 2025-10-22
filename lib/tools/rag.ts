import { tool } from "ai";
import { z } from "zod";

import { auth0 } from "@/lib/auth0";
import { answerAuthorizedQuestion } from "@/lib/rag/authorized-rag";
import type { DocumentWithScore } from "@/lib/rag/helpers";

const toSummary = (doc: DocumentWithScore) => ({
  id: doc.document.metadata.id,
  text: doc.document.text,
  score: Number(doc.score.toFixed(3)),
});

export const queryKnowledgeBase = tool({
  description:
    "Retrieve authorized snippets from the internal knowledge base and summarize them for the user.",
  inputSchema: z.object({
    question: z
      .string()
      .min(1, "Provide the user question to answer with the knowledge base.")
      .describe(
        "Natural language question that should be answered using the internal knowledge base.",
      ),
    topK: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe(
        "Optional maximum number of authorized snippets to inspect (defaults to configuration).",
      ),
    includeFiltered: z
      .boolean()
      .optional()
      .describe(
        "Set true to include snippets that were filtered out by authorization checks.",
      ),
  }),
  execute: async ({ question, topK, includeFiltered }) => {
    const session = await auth0.getSession();
    const user =
      session?.user?.sub ??
      session?.user?.email ??
      session?.user?.nickname ??
      null;

    if (!user) {
      throw new Error(
        "Authorized RAG requires an authenticated user with an identifier.",
      );
    }

    const result = await answerAuthorizedQuestion({
      question,
      userId: user,
      topK,
    });

    const payload: {
      answer: string;
      context: ReturnType<typeof toSummary>[];
      filtered?: ReturnType<typeof toSummary>[];
    } = {
      answer: result.answer,
      context: result.allowed.map(toSummary),
    };

    if (includeFiltered) {
      payload.filtered = result.filtered.map(toSummary);
    }

    return payload;
  },
});

export const ragTools = {
  queryKnowledgeBase,
};
