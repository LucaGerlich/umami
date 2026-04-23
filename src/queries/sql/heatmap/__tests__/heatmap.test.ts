import { getHeatmapData, type HeatmapPoint } from '../getHeatmapData';
import { getHeatmapPages } from '../getHeatmapPages';

// Mock the database layer so tests are pure unit tests
jest.mock('@/lib/db', () => ({
  PRISMA: 'prisma',
  CLICKHOUSE: 'clickhouse',
  runQuery: jest.fn(async (fns: Record<string, () => any>) => {
    // Default to the PRISMA branch in tests
    return fns['prisma']?.();
  }),
}));

jest.mock('@/lib/prisma', () => ({
  default: {
    rawQuery: jest.fn(),
  },
}));

jest.mock('@/lib/clickhouse', () => ({
  default: {
    rawQuery: jest.fn(),
  },
}));

import prisma from '@/lib/prisma';

const mockRawQuery = prisma.rawQuery as jest.Mock;

const WEBSITE_ID = '00000000-0000-0000-0000-000000000001';
const START_DATE = new Date('2024-01-01T00:00:00Z');
const END_DATE = new Date('2024-01-31T23:59:59Z');
const URL_PATH = '/home';

describe('getHeatmapData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregated heatmap points for a given page', async () => {
    const mockPoints: HeatmapPoint[] = [
      { x: 5000, y: 3000, count: 10 },
      { x: 2500, y: 1500, count: 5 },
    ];

    mockRawQuery.mockResolvedValue(mockPoints);

    const result = await getHeatmapData(WEBSITE_ID, {
      startDate: START_DATE,
      endDate: END_DATE,
      urlPath: URL_PATH,
    });

    expect(result).toEqual(mockPoints);
    expect(mockRawQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockRawQuery.mock.calls[0];
    expect(sql).toContain('from heatmap_data');
    expect(sql).toContain('group by x, y');
    expect(params).toMatchObject({
      websiteId: WEBSITE_ID,
      urlPath: URL_PATH,
      startDate: START_DATE,
      endDate: END_DATE,
    });
  });

  it('includes event type filter when eventType is provided', async () => {
    mockRawQuery.mockResolvedValue([]);

    await getHeatmapData(WEBSITE_ID, {
      startDate: START_DATE,
      endDate: END_DATE,
      urlPath: URL_PATH,
      eventType: 1,
    });

    const [sql, params] = mockRawQuery.mock.calls[0];
    expect(sql).toContain('and event_type =');
    expect(params.eventType).toBe(1);
  });

  it('omits event type filter when eventType is not provided', async () => {
    mockRawQuery.mockResolvedValue([]);

    await getHeatmapData(WEBSITE_ID, {
      startDate: START_DATE,
      endDate: END_DATE,
      urlPath: URL_PATH,
    });

    const [sql] = mockRawQuery.mock.calls[0];
    // The empty string substitution should mean no event_type filter
    expect(sql.replace(/\s+/g, ' ')).not.toContain('and event_type =');
  });

  it('returns empty array when no data exists', async () => {
    mockRawQuery.mockResolvedValue([]);

    const result = await getHeatmapData(WEBSITE_ID, {
      startDate: START_DATE,
      endDate: END_DATE,
      urlPath: '/nonexistent',
    });

    expect(result).toEqual([]);
  });
});

describe('getHeatmapPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a list of pages with heatmap data', async () => {
    const mockPages = [
      { urlPath: '/home', count: 100 },
      { urlPath: '/about', count: 50 },
    ];

    mockRawQuery.mockResolvedValue(mockPages);

    const result = await getHeatmapPages(WEBSITE_ID, {
      startDate: START_DATE,
      endDate: END_DATE,
    });

    expect(result).toEqual(mockPages);
    expect(mockRawQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockRawQuery.mock.calls[0];
    expect(sql).toContain('from heatmap_data');
    expect(sql).toContain('group by url_path');
    expect(params.websiteId).toBe(WEBSITE_ID);
  });

  it('returns empty array when no pages have data', async () => {
    mockRawQuery.mockResolvedValue([]);

    const result = await getHeatmapPages(WEBSITE_ID, {
      startDate: START_DATE,
      endDate: END_DATE,
    });

    expect(result).toEqual([]);
  });
});
