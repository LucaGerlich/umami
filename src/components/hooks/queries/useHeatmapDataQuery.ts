import { keepPreviousData } from '@tanstack/react-query';
import type { ReactQueryOptions } from '@/lib/types';
import type { HeatmapPoint } from '@/queries/sql/heatmap/getHeatmapData';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';

export type { HeatmapPoint };

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
