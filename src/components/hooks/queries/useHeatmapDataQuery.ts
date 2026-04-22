import { keepPreviousData } from '@tanstack/react-query';
import type { ReactQueryOptions } from '@/lib/types';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

export function useHeatmapDataQuery(
  websiteId: string,
  params: { urlPath: string; type?: number },
  options?: ReactQueryOptions<HeatmapPoint[]>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();

  return useQuery<HeatmapPoint[]>({
    queryKey: ['heatmap:data', { websiteId, startAt, endAt, ...params }],
    queryFn: async () =>
      get(`/websites/${websiteId}/heatmap`, {
        startAt,
        endAt,
        ...params,
      }),
    enabled: !!websiteId && !!params.urlPath,
    placeholderData: keepPreviousData,
    ...options,
  });
}
