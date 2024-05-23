/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs';
import dotenv from 'dotenv';
import { Log, Sports } from './module';
import { SportsMatchDetail } from './interface';

dotenv.config();

async function bootstrap() {
  Log.info(
    '\u001B[34mKorea Junior Sports Data Crawler\u001B[0m Starting...',
    true,
  );

  const dates = await Sports.getDates();
  const result: SportsMatchDetail[] = [];
  for (const date of dates) {
    const matches = await Sports.getMatchList(date);
    for (const match of matches) {
      const detail = await Sports.getMatchDetail(match);
      result.push(...detail);
    }
  }

  Log.info(
    '\u001B[34mKorea Junior Sports Data Crawler\u001B[0m Saving...',
    true,
  );

  if (!fs.existsSync('./output')) fs.mkdirSync('./output');
  fs.writeFileSync(
    './output/result.json',
    JSON.stringify(result.map((v) => ({ ...v, query: undefined }))),
  );

  Log.info(
    '\u001B[34mKorea Junior Sports Data Crawler\u001B[0m Complete!',
    true,
  );
}
bootstrap();
