import { RouteMapClient } from './client';

interface RouteMapPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RouteMapPage({ params, searchParams }: RouteMapPageProps) {
  const { id: tripId } = await params;
  const search = await searchParams;

  // Parse route data from URL search params
  const routeData = search.data ? JSON.parse(decodeURIComponent(search.data as string)) : null;

  return <RouteMapClient tripId={tripId} routeData={routeData} />;
}
