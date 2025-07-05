import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

import { GoogleDriveService } from "@/integrations/google-drive/google-drive.service";
import { QdrantService } from "@/integrations/qdrant/qdrant.service";
import { TemplateDocument } from "@/core/templates/template.schema";

import { Document, DocumentDocument } from "./document.schema";

@Injectable()
export class DocumentsService {
  constructor(
    @Inject("QDRANT_COLLECTION_DOCUMENTS") private readonly qdrantCollection: QdrantService,
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  /* ~ Public ~ */

  async generateFromTemplate({
    template,
    variables,
    name,
  }: {
    template: TemplateDocument;
    variables: Array<Record<string, string>>;
    name: string;
  }) {
    const zip = new PizZip(await this.googleDriveService.getFileBuffer({ file: template.webContentId }));

    const documentBuffer = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
      .render(variables)
      .getZip()
      .generate({ type: "nodebuffer" });

    const uploadedDocument = await this.googleDriveService.uploadFile({ buffer: documentBuffer, fileName: name });

    const createdDocument = await this.documentModel.create({
      webContentId: uploadedDocument.id,
      webContentLink: uploadedDocument.webContentLink,
      name: uploadedDocument.name,
      size: +uploadedDocument.size,
    });

    await this.qdrantCollection.createPoint({
      id: createdDocument._id.toString(),
      buffer: documentBuffer,
      payload: { _id: createdDocument._id },
    });

    return createdDocument;
  }

  async getBuffer({ document }: { document: string }) {
    const { webContentId } = (await this.documentModel.findById(document))!;
    return this.googleDriveService.getFileBuffer({ file: webContentId });
  }

  findOne({ document }: { document: string }) {
    return this.documentModel.findById(document);
  }

  async deleteOne({ document }: { document: string }) {
    const deletedDocument = await this.documentModel.findByIdAndDelete(document);
    await this.googleDriveService.deleteFile({ file: deletedDocument!.webContentId });
    await this.qdrantCollection.deletePoints({ ids: [deletedDocument!._id.toString()] });
  }

  async find() {
    const [documents, total] = await Promise.all([
      this.documentModel.find().sort({ createdAt: -1 }),
      this.documentModel.countDocuments(),
    ]);

    return { documents, total };
  }

  async search({ prompt }: { prompt: string }) {
    const points = await this.qdrantCollection.searchPoints({ prompt, limit: 5 });
    return this.documentModel.find({ _id: { $in: points.map((point) => point.payload!._id) } });
  }

  async getNameAndBuffer({ document }: { document: string }) {
    const { webContentId, name } = (await this.documentModel.findById(document))!;
    const documentBuffer = await this.googleDriveService.getFileBuffer({ file: webContentId });

    return { name, buffer: documentBuffer };
  }
}
