'use client';
import { ListItem, Row, Select, Text } from '@umami/react-zen';
import { useMessages } from '@/components/hooks';
import { useHeatmapPagesQuery } from '@/components/hooks/queries/useHeatmapPagesQuery';

interface HeatmapControlsProps {
  websiteId: string;
  urlPath: string;
  eventType: number;
  onUrlPathChange: (path: string) => void;
  onEventTypeChange: (type: number) => void;
}

const EVENT_TYPES = [
  { id: 1, label: 'clicks' },
  { id: 2, label: 'scroll' },
  { id: 3, label: 'move' },
] as const;

export function HeatmapControls({
  websiteId,
  urlPath,
  eventType,
  onUrlPathChange,
  onEventTypeChange,
}: HeatmapControlsProps) {
  const { t, labels } = useMessages();
  const { data: pages = [] } = useHeatmapPagesQuery(websiteId);

  return (
    <Row gap="3" alignItems="center" flexWrap="wrap">
      <Row alignItems="center" gap="2">
        <Text size="sm" weight="medium">
          {t(labels.page)}:
        </Text>
        <Select
          value={urlPath}
          onChange={v => onUrlPathChange(v as string)}
          style={{ minWidth: 260 }}
        >
          {pages.length === 0 ? (
            <ListItem id="">{t(labels.noData)}</ListItem>
          ) : (
            pages.map(({ urlPath: p }) => (
              <ListItem key={p} id={p}>
                {p}
              </ListItem>
            ))
          )}
        </Select>
      </Row>
      <Row alignItems="center" gap="2">
        <Text size="sm" weight="medium">
          {t(labels.type)}:
        </Text>
        <Select
          value={String(eventType)}
          onChange={v => onEventTypeChange(Number(v))}
        >
          {EVENT_TYPES.map(({ id, label }) => (
            <ListItem key={id} id={String(id)}>
              {t(labels[label as keyof typeof labels] ?? label)}
            </ListItem>
          ))}
        </Select>
      </Row>
    </Row>
  );
}
