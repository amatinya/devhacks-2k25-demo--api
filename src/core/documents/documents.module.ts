import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { GoogleDriveModule } from "@/integrations/google-drive/google-drive.module";
import { QdrantModule } from "@/integrations/qdrant/qdrant.module";

import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { Document, DocumentSchema } from "./document.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Document.name, schema: DocumentSchema }]),
    QdrantModule.forFeature({ collection: "documents" }),
    GoogleDriveModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
