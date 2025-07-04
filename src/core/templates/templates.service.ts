import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { extractRawText as extractRawTextFromBuffer } from "mammoth";

import { QdrantService } from "@/integrations/qdrant/qdrant.service";
import { GoogleDriveService } from "@/integrations/google-drive/google-drive.service";

import { Template, TemplateDocument } from "./template.schema";

// docker run -p 6333:6333 qdrant/qdrant

@Injectable()
export class TemplatesService {
  constructor(
    @Inject("QDRANT_COLLECTION_TEMPLATES") private readonly qdrantCollection: QdrantService,
    @InjectModel(Template.name) private readonly templateModel: Model<TemplateDocument>,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  /* ~ Private ~ */

  private async extractVariables({ buffer }: { buffer: Buffer }) {
    const { value: text } = await extractRawTextFromBuffer({ buffer });

    const matches: string[] = text.match(/{(.*?)}/g) ?? [];

    return Array.from(new Set(matches.map((v) => v.slice(1, -1).trim())));
  }

  /* ~ Public ~ */

  async create({ file }: { file: Express.Multer.File }) {
    const uploadedTemplate = await this.googleDriveService.uploadFile({
      fileName: file.originalname,
      buffer: file.buffer,
    });

    const template = await this.templateModel.create({
      webContentId: uploadedTemplate.id,
      webContentLink: uploadedTemplate.webContentLink,
      name: uploadedTemplate.name,
      size: +uploadedTemplate.size,
      variables: await this.extractVariables({ buffer: file.buffer }),
    });

    await this.qdrantCollection.createPoint({
      buffer: file.buffer,
      id: template._id.toString(),
      payload: { _id: template._id },
    });

    return template;
  }

  async find() {
    const [templates, total] = await Promise.all([
      this.templateModel.find().sort({ createdAt: -1 }),
      this.templateModel.countDocuments(),
    ]);
    return { templates, total };
  }

  async getBuffer({ template }: { template: string }) {
    const { webContentId } = (await this.templateModel.findById(template))!;
    return this.googleDriveService.getFileBuffer({ file: webContentId });
  }

  async deleteOne({ template }: { template: string }) {
    const deletedTemplate = await this.templateModel.findByIdAndDelete(template);
    await this.googleDriveService.deleteFile({ file: deletedTemplate!.webContentId });
    await this.qdrantCollection.deletePoints({ ids: [deletedTemplate!._id.toString()] });
  }

  async search({ prompt }: { prompt: string }) {
    const points = await this.qdrantCollection.searchPoints({ prompt, limit: 1 });
    return this.templateModel.findById(points[0].payload!._id);
  }

  findOne({ template }: { template: string }) {
    return this.templateModel.findById(template);
  }
}
