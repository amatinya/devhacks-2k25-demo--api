import { DynamicModule, Module, Provider } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ConfigService } from "@nestjs/config";

import { ConfigVariablesEnum } from "@/common/enums";
import { OpenAiModule } from "@/integrations/open-ai/open-ai.module";
import { OpenAiService } from "@/integrations/open-ai/open-ai.service";

import { QdrantService } from "./qdrant.service";

@Module({})
export class QdrantModule {
  static forRoot(): DynamicModule {
    const providers: Provider[] = [
      {
        provide: QdrantClient,
        useFactory: (configService: ConfigService) => {
          return new QdrantClient({
            // url
            // apiKey
            host: configService.get(ConfigVariablesEnum.QDRANT_HOST),
            port: +configService.get(ConfigVariablesEnum.QDRANT_PORT),
          });
        },
        inject: [ConfigService],
      },
    ];

    return {
      global: true,
      module: QdrantModule,
      imports: [OpenAiModule],
      providers,
      exports: [QdrantClient],
    };
  }

  static forFeature({ collection }: { collection: "templates" | "documents" }): DynamicModule {
    const collectionProvider = {
      provide: `QDRANT_COLLECTION_${collection.toUpperCase()}`,
      useFactory: async (qdrantClient: QdrantClient, openAiService: OpenAiService) => {
        await QdrantService.initializeCollection({ qdrant: qdrantClient, collectionName: collection });
        return new QdrantService(qdrantClient, collection, openAiService);
      },
      inject: [QdrantClient, OpenAiService],
    };

    return {
      module: QdrantModule,
      imports: [OpenAiModule],
      providers: [collectionProvider],
      exports: [collectionProvider],
    };
  }
}
