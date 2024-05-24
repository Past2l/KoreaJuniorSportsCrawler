/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';
import { Sports } from './module';

async function bootstrap() {
  const date = new Date();
  await Sports.save(
    process.env.OUTPUT || './output',
    await Sports.init(),
    date,
  );
}
bootstrap();
