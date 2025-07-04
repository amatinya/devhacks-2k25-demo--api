import { NestFactory } from "@nestjs/core";

import { AppModule } from "@/app/app.module";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: "*" });

  await app.listen(process.env.PORT ?? 8000);
};

void bootstrap();
