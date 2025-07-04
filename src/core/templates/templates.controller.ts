import { Controller, Post, Get, UseInterceptors, UploadedFile, Param, Delete } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { TemplatesService } from "./templates.service";

@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post("")
  @UseInterceptors(FileInterceptor("template"))
  async upload(@UploadedFile() template: Express.Multer.File) {
    return this.templatesService.create({ file: template });
  }

  @Get(":template")
  getTemplate(@Param("template") template: string) {
    return this.templatesService.findOne({ template });
  }

  @Get("buffer/:template")
  async getBuffer(@Param("template") template: string) {
    return this.templatesService.getBuffer({ template });
  }

  @Delete(":template")
  async delete(@Param("template") template: string) {
    return this.templatesService.deleteOne({ template });
  }

  @Get("")
  async getAll() {
    return this.templatesService.find();
  }
}
