/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs';
import axios from 'axios';
import cheerio from 'cheerio';
import { SportsMatchDetail, SportsMatchList } from '../interface';
import { Log } from './log';

export class Sports {
  static async getDates() {
    const html = await fetch(
      'https://meet.sports.or.kr/junior/schedule/scheduleDate.do',
    );
    const data = cheerio.load(await html.text())('ul#mob_gmDtList li a');
    const result = data
      .toArray()
      .map((v) => cheerio.load(v).text().replace(/\//g, ''));
    Log.debug(
      `\u001B[34mSports.getDates\u001B[0m : \u001B[32m${JSON.stringify(
        result,
      )}\u001B[0m`,
      true,
    );
    return result;
  }

  static cleanText(text: string) {
    return text
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\t/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/\&lt;/g, '<')
      .replace(/\&gt;/g, '>')
      .trim();
  }

  static async getMatchList(date: string): Promise<SportsMatchList[]> {
    const html = await (
      await axios({
        url: 'https://meet.sports.or.kr/junior/schedule/scheduleDate.do',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: new URLSearchParams({
          searchMenuId: '1503',
          searchMenuNm: '',
          processMessage: '',
          pageIndex: '1',
          searchRhCd: '',
          searchPcntGbn: '',
          searchGmDt: date,
          searchClassCd: '',
          searchGmConfirmYn: '',
          searchKorNm: '',
          searchTeamNm: '',
          searchKindCd: '',
          searchSidoCd: '',
          searchDetailClassCd: '',
        }),
      })
    ).data;
    const result: SportsMatchList[] = [];
    const data = cheerio.load(html)('h5#classNm');
    const 종목s = data.toArray().map((v) => cheerio.load(v).text());
    for (let i = 0; i < 종목s.length; i++) {
      const table = cheerio.load(html)(`table.tablesaw tbody`).eq(i);
      result.push(
        ...table
          .find('tr')
          .toArray()
          .map((v, _) => {
            const td = cheerio.load(v)('td');
            let 종별 = Sports.cleanText(td.eq(0).text());
            if (종별.substr(종별.length / 2).repeat(2) === 종별)
              종별 = 종별.substr(종별.length / 2);
            return {
              query:
                td
                  .eq(0)
                  .attr('onclick')
                  ?.split(`('`)[1]
                  ?.split(`')`)[0]
                  .split(`','`) || [],
              종목: 종목s[i],
              종별,
              세부종목: Sports.cleanText(td.eq(1).text()),
              경기구분: Sports.cleanText(td.eq(2).text()),
              상태: Sports.cleanText(td.eq(3).text()),
              일시: Sports.cleanText(td.eq(4).text()),
              경기장: Sports.cleanText(td.eq(5).text()),
              비고: Sports.cleanText(td.eq(6).text()),
            };
          }),
      );
    }
    Log.debug(
      `\u001B[34mSports.getMatchList\u001B[0m \u001B[32m${JSON.stringify(
        date,
      )}\u001B[0m : ${result.length}`,
      true,
    );
    return result;
  }

  static async getMatchDetail(
    match: SportsMatchList,
  ): Promise<SportsMatchDetail[]> {
    return match.query[3] == 'R'
      ? match.query[2] == 'T'
        ? await this._getMatchDetailRT(match)
        : await this._getMatchDetailR(match)
      : await this._getMatchDetailT(match);
  }

  static async _getMatchDetailRT(
    match: SportsMatchList,
  ): Promise<SportsMatchDetail[]> {
    const result: SportsMatchDetail[] = [];
    const html = await (
      await axios({
        url: `https://meet.sports.or.kr/junior/schedule/scheduleDetailR.do?${new URLSearchParams(
          {
            searchClassCd: '',
            searchDetailClassCd: match.query[0],
            searchRhCd: match.query[1],
            searchPcntGbn: match.query[2],
            searchConfirmYn: 'N',
          },
        )}`,
        method: 'GET',
      })
    ).data;
    const data = cheerio.load(html)('table.tablesaw tbody tr.hide-record');
    for (let i = 0; i < data.length; i++) {
      const tr = cheerio.load(html)('table.tablesaw tbody tr[onclick]').eq(i);
      const td = tr.find('td');
      const playerListQuery =
        tr.attr('onclick')?.split(`this, '`)[1]?.split(`')`)[0].split(`', '`) ||
        [];
      const playerListData = await (
        await axios({
          url: 'https://meet.sports.or.kr/junior/schedule/detailPlayerListAjax.do',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: {
            searchEntrantTeamCd: playerListQuery[0],
            searchDetailClassCd: playerListQuery[1],
            searchRhCd: playerListQuery[2],
          },
        })
      ).data;
      Log.debug(
        `\u001B[34mSports._getMatchDetailR\u001B[0m \u001B[32m${JSON.stringify(
          match.query,
        )}\u001B[0m - \u001B[34mplayerListData\u001B[0m \u001B[32m${JSON.stringify(
          playerListQuery,
        )}\u001B[0m : Success!`,
        true,
      );
      for (const player of playerListData.startList) {
        result.push({
          ...match,
          순위: Sports.cleanText(td.eq(0).text()),
          승패: '',
          시도: Sports.cleanText(td.eq(1).text()),
          참가팀명: Sports.cleanText(td.eq(2).text()),
          기록: Sports.cleanText(td.eq(3).text()),
          '신기록/비고': Sports.cleanText(td.eq(4).text()),
          선수명: player.KOR_NM,
          번호: player.EVENT_ATH_NO,
          소속: player.TEAM_NM,
          학년: player.GRADE,
          출전: '',
          포지션: '',
          진행일: match.일시.split(' ')[0],
        });
      }
    }
    Log.debug(
      `\u001B[34mSports._getMatchDetailRT\u001B[0m \u001B[32m${JSON.stringify(
        match.query,
      )}\u001B[0m : ${result.length}`,
      true,
    );
    return result;
  }

  static async _getMatchDetailR(
    match: SportsMatchList,
  ): Promise<SportsMatchDetail[]> {
    const result: SportsMatchDetail[] = [];
    const html = await (
      await axios({
        url: `https://meet.sports.or.kr/junior/schedule/scheduleDetailR.do?${new URLSearchParams(
          {
            searchClassCd: '',
            searchDetailClassCd: match.query[0],
            searchRhCd: match.query[1],
            searchPcntGbn: match.query[2],
            searchConfirmYn: 'N',
          },
        )}`,
        method: 'GET',
      })
    ).data;
    const ended = match.상태 == '종료';
    const trs = cheerio
      .load(html)('table.tablesaw tbody')
      .eq(ended ? 0 : 1)
      .find('> tr:not(.hide-record):not(tbody.startList > tr)')
      .toArray();
    for (const tr of trs) {
      const td = cheerio.load(tr)('td');
      result.push(
        ended
          ? {
              ...match,
              순위: Sports.cleanText(td.eq(0).text()),
              승패: '',
              시도: Sports.cleanText(td.eq(1).text()),
              참가팀명: '',
              기록: Sports.cleanText(td.eq(5).text()),
              '신기록/비고': Sports.cleanText(td.eq(6).text()),
              선수명: Sports.cleanText(td.eq(2).text()),
              번호: '',
              소속: Sports.cleanText(td.eq(3).text()),
              학년: Sports.cleanText(td.eq(4).text()),
              출전: '',
              포지션: '',
              진행일: match.일시.split(' ')[0],
            }
          : {
              ...match,
              순위: '',
              승패: '',
              시도: Sports.cleanText(td.eq(0).text()),
              참가팀명: '',
              기록: '',
              '신기록/비고': '',
              선수명: Sports.cleanText(td.eq(1).text()),
              번호: '',
              소속: Sports.cleanText(td.eq(2).text()),
              학년: Sports.cleanText(td.eq(4).text()),
              출전: '',
              포지션: '',
              진행일: match.일시.split(' ')[0],
            },
      );
    }
    Log.debug(
      `\u001B[34mSports._getMatchDetailR\u001B[0m \u001B[32m${JSON.stringify(
        match.query,
      )}\u001B[0m : ${result.length}`,
      true,
    );
    return result;
  }

  static async _getMatchDetailT(
    match: SportsMatchList,
  ): Promise<SportsMatchDetail[]> {
    const result: SportsMatchDetail[] = [];
    const html = await (
      await axios({
        url: `https://meet.sports.or.kr/junior/schedule/scheduleDetailT.do?${new URLSearchParams(
          {
            searchClassCd: '',
            searchDetailClassCd: match.query[0],
            searchRhCd: match.query[1],
            searchPcntGbn: match.query[2],
          },
        )}`,
        method: 'GET',
      })
    ).data;
    const tables = cheerio
      .load(html)('div.boardTable01')
      .find('table')
      .toArray();
    for (let i = 0; i < tables.length; i++) {
      const trs = cheerio.load(tables[i])('tbody tr').toArray();
      const 정보 = Sports.cleanText(
        cheerio.load(html)('div.central-board div').find('p').eq(i).html() ||
          '',
      );
      for (const tr of trs) {
        if (cheerio.load(tr).html().includes('등록되지')) continue;
        const td = cheerio.load(tr)('td');
        result.push(
          ['I', 'G'].includes(match.query[2])
            ? {
                ...match,
                순위: '',
                승패: 정보.includes('승(')
                  ? '승'
                  : 정보.includes('패(')
                  ? '패'
                  : '',
                시도: Sports.cleanText(정보.split('>')[1].split('<')[0]),
                참가팀명: '',
                기록: Sports.cleanText(정보.split('(')[1].split(')')[0]),
                '신기록/비고': '',
                선수명: Sports.cleanText(td.eq(0).text()),
                번호: '',
                소속: Sports.cleanText(td.eq(1).text().split('[')[0]),
                학년: td.eq(1).text().includes('[')
                  ? Sports.cleanText(
                      td.eq(1).text().split('[')[1].split(']')[0],
                    )
                  : '',
                출전: '',
                포지션: Sports.cleanText(td.eq(2).text()),
                진행일: match.일시.split(' ')[0],
              }
            : {
                ...match,
                순위: '',
                승패: 정보.includes('승(')
                  ? '승'
                  : 정보.includes('패(')
                  ? '패'
                  : '',
                시도: Sports.cleanText(정보.split('>')[1].split('<')[0]),
                참가팀명: '',
                기록: Sports.cleanText(정보.split('(')[1].split(')')[0]),
                '신기록/비고': '',
                선수명: Sports.cleanText(td.eq(1).text()),
                번호: '',
                소속: Sports.cleanText(td.eq(2).text().split('[')[0]),
                학년: td.eq(2).text().includes('[')
                  ? Sports.cleanText(
                      td.eq(2).text().split('[')[1].split(']')[0],
                    )
                  : '',
                출전: td
                  .eq(0)
                  .find('img')
                  .attr('src')
                  ?.includes('checkbox_check')
                  ? 'true'
                  : 'false',
                포지션: Sports.cleanText(td.eq(3).text()),
                진행일: match.일시.split(' ')[0],
              },
        );
      }
    }
    Log.debug(
      `\u001B[34mSports._getMatchDetailT\u001B[0m \u001B[32m${JSON.stringify(
        match.query,
      )}\u001B[0m : ${result.length}`,
      true,
    );
    return result;
  }
}
