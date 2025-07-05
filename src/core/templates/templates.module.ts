import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { GoogleDriveModule } from "@/integrations/google-drive/google-drive.module";
import { QdrantModule } from "@/integrations/qdrant/qdrant.module";

import { TemplatesService } from "./templates.service";
import { TemplatesController } from "./templates.controller";
import { Template, TemplateSchema } from "./template.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }]),
    QdrantModule.forFeature({ collection: "templates" }),
    GoogleDriveModule,
  ],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService],
})
export class TemplatesModule {}
