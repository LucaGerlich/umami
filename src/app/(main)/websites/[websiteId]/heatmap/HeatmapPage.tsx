'use client';
import { Button, Column, Row, Text } from '@umami/react-zen';
import { useState } from 'react';
import { WebsiteControls } from '@/app/(main)/websites/[websiteId]/WebsiteControls';
import { Panel } from '@/components/common/Panel';
import { EmptyPlaceholder } from '@/components/common/EmptyPlaceholder';
import { useMessages, useSubscription, useWebsite } from '@/components/hooks';
import { useHeatmapDataQuery } from '@/components/hooks/queries/useHeatmapDataQuery';
import { useHeatmapPagesQuery } from '@/components/hooks/queries/useHeatmapPagesQuery';
import { Flame } from '@/components/icons';
import { HeatmapControls } from './HeatmapControls';
import { HeatmapFrame } from './HeatmapFrame';
import { HeatmapLegend } from './HeatmapLegend';

export function HeatmapPage({ websiteId }: { websiteId: string }) {
  const website = useWebsite();
  const { t, labels, messages } = useMessages();
  const { hasFeature, cloudMode } = useSubscription(website?.teamId);
  const [urlPath, setUrlPath] = useState('');
  const [eventType, setEventType] = useState(1);

  const { data: pages = [] } = useHeatmapPagesQuery(websiteId);
  const resolvedPath = urlPath || pages[0]?.urlPath || '';

  const { data: points = [], isLoading } = useHeatmapDataQuery(
    websiteId,
    { urlPath: resolvedPath, type: eventType },
  );

  if (cloudMode && !hasFeature('heatmaps')) {
    return (
      <Column gap="3">
        <Panel>
          <EmptyPlaceholder
            icon={<Flame />}
            title={t(messages.upgradeRequired, { plan: 'Business' })}
            description="Visualise where users click, scroll, and move with heatmaps."
          >
            <Button
              variant="primary"
              onPress={() => window.open(`${process.env.cloudUrl}/settings/billing`, '_blank')}
            >
              {t(labels.upgrade)}
            </Button>
          </EmptyPlaceholder>
        </Panel>
      </Column>
    );
  }

  return (
    <Column gap="3">
      <WebsiteControls websiteId={websiteId} />
      <Panel>
        {pages.length === 0 && !isLoading ? (
          <EmptyPlaceholder
            icon={<Flame />}
            title={t(labels.heatmap)}
            description="No heatmap data collected yet. Add data-heatmap to your tracking script to start capturing interactions."
          />
        ) : (
          <Column gap="4">
            <HeatmapControls
              websiteId={websiteId}
              urlPath={resolvedPath}
              eventType={eventType}
              onUrlPathChange={setUrlPath}
              onEventTypeChange={setEventType}
            />
            <Row justifyContent="flex-end">
              <HeatmapLegend />
            </Row>
            <HeatmapFrame
              urlPath={resolvedPath}
              domain={website?.domain}
              points={points}
            />
            <Text size="sm" color="muted">
              {points.length === 0 && !isLoading
                ? t(messages.noDataAvailable)
                : `${points.reduce((s, p) => s + p.count, 0).toLocaleString()} interactions visualised`}
            </Text>
          </Column>
        )}
      </Panel>
    </Column>
  );
}
