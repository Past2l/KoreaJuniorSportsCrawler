export interface SportsMatchList {
  query: string[];
  종목: string;
  종별: string;
  세부종목: string;
  경기구분: string;
  상태: string;
  일시: string;
  경기장: string;
  비고: string;
}

export interface SportsMatchDetail extends SportsMatchList {
  순위: string;
  승패: string;
  시도: string;
  참가팀명: string;
  기록: string;
  '신기록/비고': string;
  선수명: string;
  번호: string;
  소속: string;
  학년: string;
  출전: string;
  포지션: string;
  진행일: string;
}
