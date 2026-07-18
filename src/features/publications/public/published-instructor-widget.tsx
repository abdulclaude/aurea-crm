import type { PublishedInstructorWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

function gridColumns(columns: number): string {
  if (columns === 1) return "sm:grid-cols-1";
  if (columns === 2) return "sm:grid-cols-2";
  if (columns === 4) return "sm:grid-cols-2 lg:grid-cols-4";
  return "sm:grid-cols-2 lg:grid-cols-3";
}

export function PublishedInstructorWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedInstructorWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}) {
  const { config } = source.widget;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName =
    source.brand.companyName ?? source.brand.name ?? "Our instructors";
  const layoutClass =
    config.layout === "LIST"
      ? "grid-cols-1"
      : `grid-cols-1 ${gridColumns(config.columns)}`;

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
            <p className="text-xs opacity-65">Instructor team</p>
          </div>
        </header>

        <div className={`grid gap-4 ${layoutClass}`}>
          {source.instructors.map((profile) => (
            <article
              className={
                config.layout === "LIST"
                  ? "grid gap-4 border-b border-[var(--publication-border,#e5e7eb)] py-4 sm:grid-cols-[8rem_1fr]"
                  : "border border-[var(--publication-border,#e5e7eb)] p-4"
              }
              key={profile.id}
            >
              {config.showProfilePhoto && profile.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className={
                    config.layout === "LIST"
                      ? "aspect-square w-full object-cover"
                      : "mb-4 aspect-[4/3] w-full object-cover"
                  }
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={profile.profilePhoto}
                />
              ) : null}
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{profile.name}</h2>
                {config.showBio && profile.bio ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 opacity-75">
                    {profile.bio}
                  </p>
                ) : null}
                {config.showSpecialties && profile.specialties.length > 0 ? (
                  <ProfileList label="Specialties" values={profile.specialties} />
                ) : null}
                {config.showCertifications && profile.certifications.length > 0 ? (
                  <ProfileList
                    label="Certifications"
                    values={profile.certifications}
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function ProfileList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium opacity-60">{label}</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-75">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}
