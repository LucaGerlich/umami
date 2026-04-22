import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

export interface HeatmapPagesFilters {
  startDate: Date;
  endDate: Date;
}

const FUNCTION_NAME = 'getHeatmapPages';

export function getHeatmapPages(
  ...args: [websiteId: string, filters: HeatmapPagesFilters]
): Promise<Array<{ urlPath: string; count: number }>> {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  { startDate, endDate }: HeatmapPagesFilters,
): Promise<Array<{ urlPath: string; count: number }>> {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    select
      url_path as "urlPath",
      count(*) as count
    from heatmap_data
    where website_id = {{websiteId::uuid}}
      and created_at between {{startDate}} and {{endDate}}
    group by url_path
    order by count desc
    limit 100
    `,
    { websiteId, startDate, endDate },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(
  websiteId: string,
  { startDate, endDate }: HeatmapPagesFilters,
): Promise<Array<{ urlPath: string; count: number }>> {
  const { rawQuery } = clickhouse;

  return rawQuery(
    `
    select
      url_path as urlPath,
      count(*) as count
    from heatmap_data
    where website_id = {websiteId:UUID}
      and created_at between {startDate:DateTime64} and {endDate:DateTime64}
    group by url_path
    order by count desc
    limit 100
    `,
    { websiteId, startDate, endDate },
    FUNCTION_NAME,
  );
}
