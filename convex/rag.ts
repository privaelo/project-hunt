import { components } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { bedrock } from "@ai-sdk/amazon-bedrock";

export const rag = new RAG(components.rag, {
  textEmbeddingModel: bedrock.embedding("amazon.titan-embed-text-v2:0"),
  embeddingDimension: 1024,
});

