import type { InstructorWidgetConfig } from "@/features/studio/widgets/contracts";

type InstructorProfileInput = {
  id: string;
  name: string;
  profilePhoto: string | null;
  bio: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
};

export function toPublicInstructorProfile(
  profile: InstructorProfileInput,
  config: InstructorWidgetConfig,
) {
  return {
    id: profile.id,
    name: profile.name.slice(0, 160),
    profilePhoto: config.showProfilePhoto
      ? safePublicImageUrl(profile.profilePhoto)
      : null,
    bio: config.showBio ? profile.bio?.slice(0, 2_000) ?? null : null,
    specialties: config.showSpecialties
      ? boundedPublicList(profile.specialties)
      : [],
    certifications: config.showCertifications
      ? boundedPublicList(profile.certifications)
      : [],
  };
}

function safePublicImageUrl(value: string | null): string | null {
  if (!value || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || isLocalHttp ? value : null;
  } catch {
    return null;
  }
}

function boundedPublicList(values: string[] | null): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((value) => value.slice(0, 120));
}
