import { isbot } from 'isbot';
import { serializeError } from 'serialize-error';
import { z } from 'zod';
import { secret } from '@/lib/crypto';
import { getClientInfo, hasBlockedIp } from '@/lib/detect';
import { parseToken } from '@/lib/jwt';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serverError } from '@/lib/response';
import { getWebsite } from '@/queries/prisma';
import { saveHeatmapData } from '@/queries/sql';

interface Cache {
  sessionId: string;
  visitId: string;
}

const pointSchema = z.object({
  urlPath: z.string().max(500),
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  eventType: z.number().int().min(1).max(3),
  timestamp: z.coerce.number().int().optional(),
});

const schema = z.object({
  type: z.literal('heatmap'),
  payload: z.object({
    website: z.uuid(),
    points: z.array(pointSchema).min(1).max(200),
    timestamp: z.coerce.number().int().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const { body, error } = await parseRequest(request, schema, { skipAuth: true });

    if (error) {
      return error();
    }

    const { website: websiteId, points, timestamp } = body.payload;

    if (!points?.length) {
      return json({ ok: true });
    }

    const cacheHeader = request.headers.get('x-umami-cache');

    if (!cacheHeader) {
      return badRequest({ message: 'Missing session token.' });
    }

    const cache = (await parseToken(cacheHeader, secret())) as Cache | null;

    if (!cache?.sessionId) {
      return badRequest({ message: 'Invalid session token.' });
    }

    const { sessionId } = cache;

    const website = await getWebsite(websiteId);

    if (!website) {
      return badRequest({ message: 'Website not found.' });
    }

    const { ip, userAgent } = await getClientInfo(request, {});

    if (!process.env.DISABLE_BOT_CHECK && isbot(userAgent)) {
      return json({ beep: 'boop' });
    }

    if (hasBlockedIp(ip)) {
      return forbidden();
    }

    const fallbackDate = new Date((timestamp || Math.floor(Date.now() / 1000)) * 1000);

    const mappedPoints = points.map(({ urlPath, x, y, eventType, timestamp: ts }) => ({
      urlPath,
      x,
      y,
      eventType,
      createdAt: ts ? new Date(ts * 1000) : fallbackDate,
    }));

    await saveHeatmapData({
      websiteId,
      sessionId,
      points: mappedPoints,
    });

    return json({ ok: true });
  } catch (e) {
    const error = serializeError(e);

    // eslint-disable-next-line no-console
    console.log(error);

    return serverError({ errorObject: error });
  }
}
