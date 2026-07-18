import parsePhoneNumberFromString, {
  type MetadataJson,
} from "libphonenumber-js/core";
import importedMetadata from "libphonenumber-js/metadata.min.json";

function metadata(): MetadataJson {
  const candidate: unknown = importedMetadata;
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "countries" in candidate
  ) {
    return candidate as MetadataJson;
  }
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "default" in candidate &&
    typeof candidate.default === "object" &&
    candidate.default !== null &&
    "countries" in candidate.default
  ) {
    return candidate.default as MetadataJson;
  }
  throw new Error("Phone-number metadata is unavailable.");
}

export function isSmsDestinationAllowed(
  destination: string,
  allowedCountries: readonly string[],
): boolean {
  const country = parsePhoneNumberFromString(destination, metadata())?.country;
  return country !== undefined && allowedCountries.includes(country);
}
