import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { TemplatesModule } from "@/core/templates/templates.module";
import { DocumentsModule } from "@/core/documents/documents.module";
import { MailerModule } from "@/core/mailer/mailer.module";
import { OpenAiModule } from "@/integrations/open-ai/open-ai.module";

import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";
import { Chat, ChatSchema } from "./chat.schemas";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    TemplatesModule,
    DocumentsModule,
    OpenAiModule,
    MailerModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
