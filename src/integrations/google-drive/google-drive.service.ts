import { Injectable } from "@nestjs/common";
import { google, drive_v3 } from "googleapis";
import * as stream from "stream";
import { ConfigService } from "@nestjs/config";

import { ConfigVariablesEnum } from "@/common/enums";

@Injectable()
export class GoogleDriveService {
  private readonly folderId = "1IRwxf8hiyLD0ZAbbETPIvHIb6sHIbzIl";
  private driveClient: drive_v3.Drive;

  constructor(private readonly configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: this.configService.get<string>(ConfigVariablesEnum.GCP_PROJECT_ID),
        private_key_id: this.configService.get(ConfigVariablesEnum.GCP_PRIVATE_KEY_ID),
        private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC31xrETclhzP8A
RlZ/8a19L55iR7id/wHNehXe+U5OWwf3sbJ1If2XTANk2Wr/zdfFmtPf3vgHAoMA
VmiqLiQoNOwTZPD56Rbli9jl7BH5RNVedAogmWVJbyOkVXSoFr9mRlof7xtpI9Tx
JTeClss9SE160pSe+iT1OiV0rfrPE+MK5+D7dCjMfQpAZ2pzwuzEMK+qGpoBb76y
KYmpj1Z+yNpXOIXwfMAcPulRrBJUM6Ex7hkUVbRRudvgcR7Ta6VJXyo13/pgYvx9
71fGWq91smsXruqNOkMguqsYBT/59RIwli0axHlel/TdlGJm9hjKsFTLDOLor01h
ZUoehNXlAgMBAAECggEABfZafmJddSgOXyZo2MZwT36TXvGfibRDDTR38B7azMzE
AeMH/CeJj3YeKA+rGjfFVznRxFF5btTEhebHhzlu38TzoR9ld115aiFye+Z/oLt8
Rg9yYqNG9y49FC/XVDpEo98FPkLley/30IhZ+AjG96pYJPMecdeACloD6/hWiY+3
zCXsivKcbtIGJRXUQJ1H7vWNDxeSZKM46jwk8yBa5nAMh0fcFXSFKIjosCJ33nua
S0YA/EAa25PBYJJy0D4F9P3VvDRnAyEh+X2kDFGxM55xz7gWfNPFO3ovAPsOkjRT
ZQVD8FOWkuZ7K2iP+0THNLVJR7XstVN8ZIKP0pej4QKBgQD/EI+nuwP8TvywuNWa
pzONBGJlDZf9jtbVXhVV2vGJKB3q4wXoFSm52Rpin9B/WaqOoxoJyhy+Oj2reh3F
8mWSzTGSKOCa+b1sxl4nmmECl2Qwj4B7pwxbnC7ZYDbqLTpxhqk7+EozVEzDgIbh
rpZtOnqZcGXWzPv/sNwsNUOwFQKBgQC4g66tnUfXC3KfnSHCfztrhg4+fVwxG76a
gQ6UXoIY4XvJS1IwVjkdnxecq5NtxJSpbT/TCcZoXpe3MgOwPKPEb8wwZ8tgLhTl
0YIwPKCqe3cRI+zjQa8xI2tsKlbZpwsCyFFlSkfR/thXvNYsQBSyq8rH0fxzW3OA
wfHr+CIykQKBgQD4jLPgN/6XRIU61LLaBKrYdPhJDukYXbP9sbPKuRL7m8sjk9yy
nsTNZMEwcBmlr8PjQQ7jkT9XI7vquJIAzcerOSdgDVNp0YmEUP15TBfShaJNK9mB
JXSGZPjGPNrmcfJspFOPq9DqmfA/5qQJka7me8DyerPSkGfUbwzuS21NTQKBgFKB
h4VYk/wjwVCAGc13ySEuY4Yr1iKbbmJ2HQfZLsFjak+7X3f/xjBpqExFKHpn8bXF
BUofz9lxmtOvCJkwtGYtO5fVgcpzMKMHSPi603kIFljSwKVqBKWrWeiXEhjnKfRH
kKYDThQnqaOp6/cDfH3cdaNeUU1f8kj78Gp8nQYRAoGAGl1bDT6W22+UXCcZgO6E
coICMRaEOQBoAPqN20hh3gdeiC/MicvZvfEY5+nMpQcRkujQiJMnP6mwBlFaBOQF
no/D0NDKL6ofRg1yqr9xSy2O4cXWD9+tXarumMUR1ic9OmJCsWgCgI8mOY/rIzoP
RP35+erpxgSCIV4k01/PX4s=
-----END PRIVATE KEY-----`,
        client_email: this.configService.get(ConfigVariablesEnum.GCP_CLIENT_EMAIL),
        client_id: this.configService.get(ConfigVariablesEnum.GCP_CLIENT_ID),
        universe_domain: "googleapis.com",
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
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
