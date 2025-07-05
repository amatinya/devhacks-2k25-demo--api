import { Injectable } from "@nestjs/common";
import { MailerService as NestMailerService } from "@nestjs-modules/mailer";
import type { Attachment } from "nodemailer/lib/mailer";
import type { SentMessageInfo } from "nodemailer";

@Injectable()
export class MailerService {
  constructor(private readonly nestMailerService: NestMailerService) {}

  send({
    recipient: to,
    subject,
    message,
    attachments,
  }: {
    recipient: string;
    subject: string;
    message: string;
    attachments: Attachment[];
  }): Promise<SentMessageInfo> {
    return this.nestMailerService.sendMail({ to, subject, template: "./main", context: { message }, attachments });
  }
}
