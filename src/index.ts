/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';
import { Sports } from './module';
import cron from 'node-cron';

async function bootstrap() {
  cron.schedule('0 * * * *', async () => {
    const date = new Date();
    await Sports.save(
      process.env.OUTPUT || './output',
      await Sports.init(),
      date,
    );
  });
}
bootstrap();
