import type { Metadata } from 'next';
import { HeatmapPage } from './HeatmapPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <HeatmapPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Heatmap',
};
