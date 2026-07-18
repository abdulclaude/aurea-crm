import type { PublishedOnDemandWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

export function PublishedOnDemandWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedOnDemandWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName =
    source.brand.companyName ?? source.brand.name ?? "On-demand video";
  const columns =
    config.columns === 1
      ? "sm:grid-cols-1"
      : config.columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <main
      className="aurea-publication-root min-h-screen px-4 py-5"
      style={{ background: transparentBackground ? "transparent" : undefined }}
    >
      {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center gap-3 border-b border-[var(--publication-border,#e5e7eb)] pb-4">
          {source.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="size-9 object-contain" src={source.brand.logo} alt="" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{brandName}</h1>
            <p className="text-xs opacity-65">Free on-demand classes</p>
          </div>
        </header>
        <div
          className={
            config.layout === "GRID"
              ? `grid grid-cols-1 gap-5 ${columns}`
              : "divide-y divide-[var(--publication-border,#e5e7eb)]"
          }
        >
          {source.assets.map((asset) => (
            <article
              key={asset.id}
              className={
                config.layout === "GRID"
                  ? "border border-[var(--publication-border,#e5e7eb)]"
                  : "grid gap-4 py-5 md:grid-cols-[minmax(16rem,2fr)_3fr]"
              }
            >
              <video
                aria-label={asset.title}
                className="aspect-video w-full bg-black object-contain"
                controls
                playsInline
                poster={asset.thumbnailUrl ?? undefined}
                preload="metadata"
                src={asset.videoUrl}
              />
              <div className={config.layout === "GRID" ? "p-4" : "min-w-0 py-1"}>
                <h2 className="text-sm font-semibold">{asset.title}</h2>
                {asset.instructorName || asset.classTypeName ? (
                  <p className="mt-1 text-xs opacity-65">
                    {[asset.classTypeName, asset.instructorName]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                ) : null}
                {asset.durationSeconds ? (
                  <p className="mt-2 text-xs font-medium opacity-70">
                    {formatDuration(asset.durationSeconds)}
                  </p>
                ) : null}
                {asset.description ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">
                    {asset.description}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  const hours = Math.floor(minutes / 60);
  return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${remainder
    .toString()
    .padStart(2, "0")}`;
}
