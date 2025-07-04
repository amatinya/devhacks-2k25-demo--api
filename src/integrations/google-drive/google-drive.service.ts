import { Injectable } from "@nestjs/common";
import { google, drive_v3 } from "googleapis";
import * as stream from "stream";
import * as path from "path";

@Injectable()
export class GoogleDriveService {
  private readonly folderId = "1IRwxf8hiyLD0ZAbbETPIvHIb6sHIbzIl";
  private driveClient: drive_v3.Drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), "google-api-credentials.json"),
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    this.driveClient = google.drive({ version: "v3", auth });
  }

  async uploadFile({ buffer, fileName }: { buffer: Buffer; fileName: string }) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const {
      data: { id, webContentLink, size, name },
    } = await this.driveClient.files.create({
      requestBody: { name: fileName, parents: [this.folderId] },
      media: {
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        body: bufferStream,
      },
      fields: "id, webContentLink, size, name",
    });

    return { id: id!, webContentLink: webContentLink!, size: size!, name: name! };
  }

  async getFileBuffer({ file }: { file: string }) {
    const res = await this.driveClient.files.get({ fileId: file, alt: "media" }, { responseType: "arraybuffer" });
    return Buffer.from(res.data as ArrayBuffer);
  }

  async deleteFile({ file }: { file: string }) {
    return this.driveClient.files.delete({ fileId: file });
  }
}
