import { keepPreviousData } from '@tanstack/react-query';
import type { ReactQueryOptions } from '@/lib/types';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';

export function useHeatmapPagesQuery(
  websiteId: string,
  options?: ReactQueryOptions<Array<{ urlPath: string; count: number }>>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();

  return useQuery<Array<{ urlPath: string; count: number }>>({
    queryKey: ['heatmap:pages', { websiteId, startAt, endAt }],
    queryFn: async () =>
      get(`/websites/${websiteId}/heatmap/pages`, {
        startAt,
        endAt,
      }),
    enabled: !!websiteId,
    placeholderData: keepPreviousData,
    ...options,
  });
}
