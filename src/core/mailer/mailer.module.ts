import { Module } from "@nestjs/common";
import { MailerModule as NestMailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { ConfigVariablesEnum } from "@/common/enums";

import { MailerService } from "./mailer.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: configService.get(ConfigVariablesEnum.MAILER_USER),
            pass: configService.get(ConfigVariablesEnum.MAILER_PASSWORD),
          },
        },
        defaults: { from: `Ararat Matinyan | ${configService.get(ConfigVariablesEnum.MAILER_FROM)}` },
        template: { dir: join(__dirname, "templates"), adapter: new HandlebarsAdapter(), options: { strict: true } },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
