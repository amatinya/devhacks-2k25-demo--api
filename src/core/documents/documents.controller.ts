import { Controller, Get, Delete, Param } from "@nestjs/common";

import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("buffer/:document")
  async getBuffer(@Param("document") document: string) {
    return this.documentsService.getBuffer({ document });
  }

  @Get(":document")
  getDocument(@Param("document") document: string) {
    return this.documentsService.findOne({ document });
  }

  @Delete(":document")
  delete(@Param("document") document: string) {
    return this.documentsService.deleteOne({ document });
  }

  @Get("")
  getAll() {
    return this.documentsService.find();
  }
}
