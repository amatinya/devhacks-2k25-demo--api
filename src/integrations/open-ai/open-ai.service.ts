import { Injectable, OnModuleInit } from "@nestjs/common";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";
import { extractRawText as extractRawTextFromBuffer } from "mammoth";

import { ConfigVariablesEnum } from "@/common/enums";
import { isBufferLike } from "@/common/utils";

import { loadSystemPrompt } from "./system-prompts";

@Injectable()
export class OpenAiService implements OnModuleInit {
  private readonly openAi: OpenAI;
  private TextEmbeddingPreparationSystemPrompt: string;

  constructor(private readonly configService: ConfigService) {
    this.openAi = new OpenAI({ apiKey: this.configService.get(ConfigVariablesEnum.OPENAI_API_KEY) });
  }

  async onModuleInit() {
    this.TextEmbeddingPreparationSystemPrompt = await loadSystemPrompt({
      name: "text-embedding-preparation",
    });
  }

  /* ~ Private ~ */

  private async preprocessRawTextForEmbedding({ rawText }: { rawText: string }) {
    const result = await this.openAi.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: this.TextEmbeddingPreparationSystemPrompt },
        { role: "user", content: rawText },
      ],
    });

    return result.choices[0].message.content ?? rawText;
  }

  /* ~ Public ~ */

  async createEmbedding({ value }: { value: string | Buffer }) {
    const rawText = isBufferLike(value) ? (await extractRawTextFromBuffer({ buffer: value })).value : value;

    const cleanedText = await this.preprocessRawTextForEmbedding({ rawText });

    const {
      data: [{ embedding }],
    } = await this.openAi.embeddings.create({ model: "text-embedding-3-large", input: cleanedText, dimensions: 1536 });

    return embedding;
  }

  createChat({ temperature = 1, ...params }: Omit<ChatCompletionCreateParamsNonStreaming, "model">) {
    return this.openAi.chat.completions.create({ model: "gpt-4o", temperature, ...params });
  }
}
