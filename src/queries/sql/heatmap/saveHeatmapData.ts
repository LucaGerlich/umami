import clickhouse from '@/lib/clickhouse';
import { uuid } from '@/lib/crypto';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import kafka from '@/lib/kafka';
import prisma from '@/lib/prisma';

export interface SaveHeatmapDataArgs {
  websiteId: string;
  sessionId: string;
  points: Array<{
    urlPath: string;
    x: number;
    y: number;
    eventType: number;
    createdAt?: Date;
  }>;
}

export async function saveHeatmapData(args: SaveHeatmapDataArgs) {
  return runQuery({
    [PRISMA]: () => relationalQuery(args),
    [CLICKHOUSE]: () => clickhouseQuery(args),
  });
}

async function relationalQuery({ websiteId, sessionId, points }: SaveHeatmapDataArgs) {
  const rows = points.map(({ urlPath, x, y, eventType, createdAt }) => ({
    id: uuid(),
    websiteId,
    sessionId,
    urlPath,
    x,
    y,
    eventType,
    createdAt: createdAt ?? new Date(),
  }));

  return prisma.client.heatmapData.createMany({ data: rows });
}

async function clickhouseQuery({ websiteId, sessionId, points }: SaveHeatmapDataArgs) {
  const { insert, getUTCString } = clickhouse;
  const { sendMessage } = kafka;

  const rows = points.map(({ urlPath, x, y, eventType, createdAt }) => ({
    heatmap_id: uuid(),
    website_id: websiteId,
    session_id: sessionId,
    url_path: urlPath,
    x,
    y,
    event_type: eventType,
    created_at: getUTCString(createdAt ?? new Date()),
  }));

  if (kafka.enabled) {
    return Promise.all(rows.map(row => sendMessage('heatmap_data', row)));
  }

  return insert('heatmap_data', rows);
}
