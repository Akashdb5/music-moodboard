import { FGAFilter } from "@auth0/ai";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

import {
  DocumentWithScore,
  LocalVectorStore,
  readDocuments,
} from "./helpers";

const DEFAULT_RESULTS = Number.parseInt(
  process.env.RAG_TOP_K ?? "",
  10,
) || 6;
const RAG_MODEL = process.env.RAG_TEXT_MODEL ?? "gpt-4o-mini";

let vectorStorePromise: Promise<LocalVectorStore> | null = null;

const ensureVectorStore = async () => {
  if (vectorStorePromise == null) {
    vectorStorePromise = (async () => {
      const documents = await readDocuments();
      return LocalVectorStore.fromDocuments(documents);
    })();
  }
  return vectorStorePromise;
};

const createRetriever = (userId: string) =>
  FGAFilter.create<DocumentWithScore>({
    buildQuery: (doc) => ({
      user: ensurePrefixed("user", userId),
      object: ensurePrefixed("doc", doc.document.metadata.id),
      relation: "viewer",
    }),
  });

const ensurePrefixed = (prefix: string, identifier: string) => {
  if (identifier.startsWith(`${prefix}:`)) {
    return identifier;
  }
  return `${prefix}:${identifier}`;
};

export type AuthorizedContext = {
  allowed: DocumentWithScore[];
  filtered: DocumentWithScore[];
};

export type AuthorizedAnswer = AuthorizedContext & {
  answer: string;
};

const isMissingAuthorizationModelError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const apiErrorCode = (error as { apiErrorCode?: unknown }).apiErrorCode;
  if (apiErrorCode === "latest_authorization_model_not_found") {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("No authorization models found");
};

export async function getAuthorizedContext({
  question,
  userId,
  topK,
}: {
  question: string;
  userId: string;
  topK?: number;
}): Promise<AuthorizedContext> {
  const vectorStore = await ensureVectorStore();
  const limit = Math.max(topK ?? DEFAULT_RESULTS, 1);
  const searchResults = await vectorStore.search(question, limit);

  if (searchResults.length === 0) {
    return { allowed: [], filtered: [] };
  }

  const retriever = createRetriever(userId);
  const allowed = await retriever.filter(searchResults);

  const allowedSet = new Set(allowed);
  const filtered = searchResults.filter((doc) => !allowedSet.has(doc));

  return { allowed, filtered };
}

const formatContext = (docs: DocumentWithScore[]) =>
  docs
    .map(
      (doc, index) =>
        `Document ${index + 1} (${doc.document.metadata.id} — score: ${doc.score.toFixed(3)}):\n${doc.document.text}`,
    )
    .join("\n\n");

export async function answerAuthorizedQuestion({
  question,
  userId,
  topK,
}: {
  question: string;
  userId: string;
  topK?: number;
}): Promise<AuthorizedAnswer> {
  let context: AuthorizedContext;

  try {
    context = await getAuthorizedContext({ question, userId, topK });
  } catch (error) {
    if (isMissingAuthorizationModelError(error)) {
      return {
        allowed: [],
        filtered: [],
        answer:
          "The knowledge base is not initialized. Ask an administrator to create an OpenFGA authorization model before using this tool.",
      };
    }

    throw error;
  }

  if (context.allowed.length === 0) {
    return {
      ...context,
      answer:
        "No authorized knowledge was found for this user. Either no documents match the request or your account lacks permission.",
    };
  }

  const prompt = `Answer the following question using only the provided authorized context.
If the context does not contain the answer, respond that the information is not available for this user.

Context:
${formatContext(context.allowed)}

Question: ${question}`;

  const { text } = await generateText({
    model: openai(RAG_MODEL),
    prompt,
  });

  return {
    ...context,
    answer: text.trim(),
  };
}
