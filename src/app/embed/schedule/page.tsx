import { db } from "@/db";
import { organization, studioClass, widgetConfig } from "@/db/schema";
import { addDays, format, startOfDay } from "date-fns";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Class Schedule" };

async function getSchedule(widgetId: string | null, orgSlug: string | null) {
  let organizationId: string | null = null;

  if (widgetId) {
    const widget = await db.query.widgetConfig.findFirst({
      where: eq(widgetConfig.id, widgetId),
      columns: { organizationId: true, isActive: true },
    });
    if (!widget?.isActive) return null;
    organizationId = widget.organizationId;
  } else if (orgSlug) {
    const org = await db.query.organization.findFirst({
      where: eq(organization.slug, orgSlug),
      columns: { id: true },
    });
    organizationId = org?.id ?? null;
  }

  if (!organizationId) return null;

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { name: true, logo: true },
  });

  const from = startOfDay(new Date());
  const to = addDays(from, 14);

  const classes = await db.query.studioClass.findMany({
    where: and(
      eq(studioClass.organizationId, organizationId),
      eq(studioClass.status, "SCHEDULED"),
      gte(studioClass.startTime, from),
      lte(studioClass.startTime, to),
    ),
    with: {
      classType: { columns: { name: true, color: true } },
      instructor: { columns: { name: true } },
      room: { columns: { name: true } },
      studioBookings: { columns: { id: true } },
    },
    orderBy: asc(studioClass.startTime),
    limit: 100,
  });

  return {
    org,
    classes: classes.map((cls) => ({
      ...cls,
      _count: { studioBooking: cls.studioBookings.length },
    })),
  };
}

interface PageProps {
  searchParams: Promise<{ widget?: string; org?: string }>;
}

export default async function EmbedSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const widgetId = params.widget ?? null;
  const orgSlug = params.org ?? null;

  const data = await getSchedule(widgetId, orgSlug);

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Schedule not available
      </div>
    );
  }

  const { org, classes } = data;

  const groupedByDay = classes.reduce<Record<string, typeof classes>>(
    (acc, cls) => {
      const day = format(new Date(cls.startTime), "yyyy-MM-dd");
      if (!acc[day]) acc[day] = [];
      acc[day].push(cls);
      return acc;
    },
    {},
  );

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: "100%",
        padding: "16px",
      }}
    >
      {org?.name && (
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {org.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo}
              alt={org.name}
              style={{ height: "28px", objectFit: "contain" }}
            />
          )}
          <h1 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
            {org.name}
          </h1>
        </div>
      )}

      {Object.keys(groupedByDay).length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          No upcoming classes scheduled.
        </p>
      ) : (
        Object.entries(groupedByDay).map(([day, dayClasses]) => (
          <div key={day} style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#6b7280",
                marginBottom: "8px",
                paddingBottom: "6px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              {format(new Date(day), "EEEE, d MMMM")}
            </h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {dayClasses.map((cls) => {
                const spotsLeft = cls.maxCapacity
                  ? cls.maxCapacity - cls._count.studioBooking
                  : null;
                const isFull = spotsLeft !== null && spotsLeft <= 0;

                return (
                  <div
                    key={cls.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: isFull ? "#f9fafb" : "#ffffff",
                    }}
                  >
                    {cls.classType?.color && (
                      <div
                        style={{
                          width: "4px",
                          alignSelf: "stretch",
                          borderRadius: "2px",
                          backgroundColor: cls.classType.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: 600 }}>
                          {cls.name}
                        </span>
                        {cls.difficulty && (
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            {cls.difficulty.toLowerCase()}
                          </span>
                        )}
                        {cls.isVirtual && (
                          <span
                            style={{
                              fontSize: "11px",
                              backgroundColor: "#dbeafe",
                              color: "#1d4ed8",
                              borderRadius: "4px",
                              padding: "1px 6px",
                            }}
                          >
                            Online
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        {format(new Date(cls.startTime), "HH:mm")} –{" "}
                        {format(new Date(cls.endTime), "HH:mm")}
                        {cls.instructor?.name && ` · ${cls.instructor.name}`}
                        {cls.room?.name && ` · ${cls.room.name}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {isFull ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#ef4444",
                            fontWeight: 500,
                          }}
                        >
                          Full
                        </span>
                      ) : spotsLeft !== null ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: spotsLeft <= 3 ? "#f59e0b" : "#6b7280",
                          }}
                        >
                          {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <p
        style={{
          textAlign: "center",
          fontSize: "10px",
          color: "#d1d5db",
          marginTop: "16px",
        }}
      >
        Powered by Aurea Studio
      </p>
    </div>
  );
}
