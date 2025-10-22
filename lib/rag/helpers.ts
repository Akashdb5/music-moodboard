import path from "node:path";
import { promises as fs } from "node:fs";

import { cosineSimilarity, embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL =
  process.env.RAG_EMBEDDING_MODEL ?? "text-embedding-3-small";

const DEFAULT_DOCUMENT_ROOT =
  process.env.RAG_DOCS_PATH ?? path.join(process.cwd(), "assets", "docs");

type VectorEntry = {
  embedding: number[];
  value: Document;
};

export type Document = {
  metadata: {
    id: string;
    path?: string;
  };
  text: string;
};

export type DocumentWithScore = {
  document: Document;
  score: number;
};

const isMarkdownFile = async (absolutePath: string) => {
  try {
    const stats = await fs.stat(absolutePath);
    return stats.isFile();
  } catch {
    return false;
  }
};

export async function readDocuments(
  directory: string = DEFAULT_DOCUMENT_ROOT,
): Promise<Document[]> {
  const absoluteRoot = path.isAbsolute(directory)
    ? directory
    : path.join(process.cwd(), directory);

  const entries = await fs.readdir(absoluteRoot);
  const documents: Document[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteRoot, entry);

    if (!(await isMarkdownFile(absolutePath))) {
      continue;
    }

    const text = await fs.readFile(absolutePath, "utf8");
    documents.push({
      text,
      metadata: {
        id: path.basename(entry, path.extname(entry)),
        path: absolutePath,
      },
    });
  }

  return documents;
}

const chunkDocument = (content: string) =>
  content
    .split(".")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && chunk !== "\n");

export class LocalVectorStore {
  private constructor(private readonly entries: VectorEntry[]) {}

  static async fromDocuments(documents: Document[]) {
    const entries: VectorEntry[] = [];

    for (const document of documents) {
      const chunks = chunkDocument(document.text);

      if (chunks.length === 0) {
        continue;
      }

      const { embeddings } = await embedMany({
        model: openai.embedding(EMBEDDING_MODEL),
        values: chunks,
      });

      embeddings.forEach((embedding, index) => {
        entries.push({
          embedding,
          value: {
            text: chunks[index]!,
            metadata: document.metadata,
          },
        });
      });
    }

    return new LocalVectorStore(entries);
  }

  async search(query: string, k = 3): Promise<DocumentWithScore[]> {
    if (this.entries.length === 0) {
      return [];
    }

    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: query,
    });

    return this.entries
      .map((entry) => ({
        document: entry.value,
        score: cosineSimilarity(embedding, entry.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
