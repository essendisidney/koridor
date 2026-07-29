import { ConfigService } from '@nestjs/config';
import { createKoridorApp } from './create-app';

async function bootstrap() {
  const { app } = await createKoridorApp();
  const config = app.get(ConfigService);
  const prefix = config.getOrThrow<string>('api.prefix');
  const port = config.getOrThrow<number>('api.port');

  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Koridor API listening on http://localhost:${port}/${prefix}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

void bootstrap();
