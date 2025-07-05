import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

import { ConfigVariablesEnum } from "@/common/enums";
import { TemplatesModule } from "@/core/templates/templates.module";
import { QdrantModule } from "@/integrations/qdrant/qdrant.module";
import { DocumentsModule } from "@/core/documents/documents.module";
import { ChatsModule } from "@/core/chats/chats.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get(ConfigVariablesEnum.MONGODB_URI),
        dbName: configService.get(ConfigVariablesEnum.MONGODB_NAME),
      }),
    }),
    QdrantModule.forRoot(),
    TemplatesModule,
    DocumentsModule,
    ChatsModule,
  ],
})
export class AppModule {}
