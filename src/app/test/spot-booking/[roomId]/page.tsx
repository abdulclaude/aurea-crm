import { SpotBookingTest } from "./spot-booking-test";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function TestSpotBookingPage({ params }: PageProps) {
  const { roomId } = await params;
  return <SpotBookingTest roomId={roomId} />;
}
