export const runtime = "nodejs";

export function GET(): Response {
  return Response.json(
    {
      error:
        "The legacy Stripe OAuth route is disabled. Start Express onboarding from payment settings.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
