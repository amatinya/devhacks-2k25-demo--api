import { Injectable } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";

import { OpenAiService } from "@/integrations/open-ai/open-ai.service";

@Injectable()
export class QdrantService {
  private readonly uuidNamespace = "eb7d255b-7e6d-41fd-9836-70a1c67b5958";

  constructor(
    private readonly qdrant: QdrantClient,
    private readonly collectionName: string,
    private readonly openAiService: OpenAiService
  ) {}

  /* ~ Public ~ */

  static async initializeCollection({ qdrant, collectionName }: { qdrant: QdrantClient; collectionName: string }) {
    const { collections } = await qdrant.getCollections();

    if (!collections.some((collection) => collection.name === collectionName)) {
      await qdrant.createCollection(collectionName, { vectors: { size: 1536, distance: "Cosine" } });
    }
  }

  async createPoint({ id, buffer, payload }: { id: string; buffer: Buffer; payload: Record<string, unknown> }) {
    const embedding = await this.openAiService.createEmbedding({ value: buffer });

    return this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [{ id: uuidv5(id, this.uuidNamespace), vector: embedding, payload }],
    });
  }

  deletePoints({ ids }: { ids: string[] }) {
    return this.qdrant.delete(this.collectionName, {
      wait: true,
      points: ids.map((id) => uuidv5(id, this.uuidNamespace)),
    });
  }

  async searchPoints({ prompt, limit }: { prompt: string; limit: number }) {
    const embedding = await this.openAiService.createEmbedding({ value: prompt });

    return this.qdrant.search(this.collectionName, { vector: embedding, limit });
  }
}
