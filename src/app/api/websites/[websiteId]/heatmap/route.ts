import { getRequestDateRange, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import { getHeatmapData } from '@/queries/sql';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = withDateRange({
    urlPath: z.string(),
    type: z.coerce.number().int().min(1).max(3).optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const { startDate, endDate } = getRequestDateRange(query);
  const { urlPath, type } = query;

  const data = await getHeatmapData(websiteId, {
    startDate,
    endDate,
    urlPath,
    eventType: type,
  });

  return json(data);
}
