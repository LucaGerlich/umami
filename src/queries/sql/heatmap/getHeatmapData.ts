import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

export interface HeatmapFilters {
  startDate: Date;
  endDate: Date;
  urlPath: string;
  eventType?: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

const FUNCTION_NAME = 'getHeatmapData';

export function getHeatmapData(
  ...args: [websiteId: string, filters: HeatmapFilters]
): Promise<HeatmapPoint[]> {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  { startDate, endDate, urlPath, eventType }: HeatmapFilters,
): Promise<HeatmapPoint[]> {
  const { rawQuery } = prisma;

  const typeFilter = eventType != null ? 'and event_type = {{eventType}}' : '';

  return rawQuery(
    `
    select
      x,
      y,
      count(*) as count
    from heatmap_data
    where website_id = {{websiteId::uuid}}
      and url_path = {{urlPath}}
      and created_at between {{startDate}} and {{endDate}}
      ${typeFilter}
    group by x, y
    order by count desc
    limit 10000
    `,
    { websiteId, urlPath, startDate, endDate, eventType },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(
  websiteId: string,
  { startDate, endDate, urlPath, eventType }: HeatmapFilters,
): Promise<HeatmapPoint[]> {
  const { rawQuery } = clickhouse;

  const typeFilter = eventType != null ? 'and event_type = {eventType:Int8}' : '';

  return rawQuery(
    `
    select
      x,
      y,
      count(*) as count
    from heatmap_data
    where website_id = {websiteId:UUID}
      and url_path = {urlPath:String}
      and created_at between {startDate:DateTime64} and {endDate:DateTime64}
      ${typeFilter}
    group by x, y
    order by count desc
    limit 10000
    `,
    { websiteId, urlPath, startDate, endDate, eventType },
    FUNCTION_NAME,
  );
}
