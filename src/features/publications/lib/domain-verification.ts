import { lookup, resolveTxt } from "node:dns/promises";
import { isIP } from "node:net";
import { connect as connectTls } from "node:tls";
import { domainToASCII } from "node:url";

const DNS_TIMEOUT_MS = 5_000;
const TLS_TIMEOUT_MS = 5_000;

type DomainAddress = { address: string; family: number };

export type PublicationDomainNetwork = {
  resolveTxt: (hostname: string) => Promise<readonly (readonly string[])[]>;
  lookup: (hostname: string) => Promise<readonly DomainAddress[]>;
  connectTls: (address: string, servername: string) => Promise<void>;
};

export type PublicationDomainCheck = {
  ownershipVerified: boolean;
  tlsActive: boolean;
  error: string | null;
};

function parseIpv4(address: string): readonly number[] | null {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return parts;
}

function isPublicIpv4(address: string): boolean {
  const parts = parseIpv4(address);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === undefined || b === undefined) return false;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function ipv6Bytes(address: string): readonly number[] | null {
  const withoutZone = address.toLowerCase().split("%")[0] ?? "";
  let normalized = withoutZone;
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4 = parseIpv4(normalized.slice(lastColon + 1));
    if (!ipv4) return null;
    normalized = `${normalized.slice(0, lastColon)}:${(
      (ipv4[0] ?? 0) * 256 +
      (ipv4[1] ?? 0)
    ).toString(16)}:${((ipv4[2] ?? 0) * 256 + (ipv4[3] ?? 0)).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];
  if (groups.length !== 8) return null;
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const value = Number.parseInt(group, 16);
    bytes.push(value >> 8, value & 0xff);
  }
  return bytes;
}

function isPublicIpv6(address: string): boolean {
  const bytes = ipv6Bytes(address);
  if (!bytes) return false;
  const allZero = bytes.every((byte) => byte === 0);
  const loopback =
    bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
  const uniqueLocal = ((bytes[0] ?? 0) & 0xfe) === 0xfc;
  const linkOrSiteLocal =
    bytes[0] === 0xfe &&
    (((bytes[1] ?? 0) & 0xc0) === 0x80 || ((bytes[1] ?? 0) & 0xc0) === 0xc0);
  const multicast = bytes[0] === 0xff;
  const documentation =
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x0d &&
    bytes[3] === 0xb8;
  const mappedIpv4 =
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;
  const compatibleIpv4 = bytes.slice(0, 12).every((byte) => byte === 0);
  if (mappedIpv4 || compatibleIpv4) {
    return isPublicIpv4(bytes.slice(12).join("."));
  }
  return !(
    allZero ||
    loopback ||
    uniqueLocal ||
    linkOrSiteLocal ||
    multicast ||
    documentation
  );
}

export function isPublicIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version === 6) return isPublicIpv6(address);
  return false;
}

export function normalizePublicationDomain(host: string): string {
  const withoutTrailingDot = host.trim().toLowerCase().replace(/\.$/, "");
  const ascii = domainToASCII(withoutTrailingDot);
  if (
    !ascii ||
    ascii.length > 253 ||
    isIP(ascii) !== 0 ||
    ascii === "localhost" ||
    ascii.endsWith(".localhost") ||
    ascii.endsWith(".local") ||
    ascii.endsWith(".internal") ||
    ascii.includes("/") ||
    ascii.includes(":")
  ) {
    throw new Error("Enter a public domain name without a path or port.");
  }

  const labels = ascii.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error("Enter a valid public domain name.");
  }
  return ascii;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Domain check timed out.")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

const defaultNetwork: PublicationDomainNetwork = {
  resolveTxt: async (hostname) => resolveTxt(hostname),
  lookup: async (hostname) =>
    lookup(hostname, { all: true, verbatim: true }).then((rows) =>
      rows.map((row) => ({ address: row.address, family: row.family })),
    ),
  connectTls: async (address, servername) =>
    new Promise<void>((resolve, reject) => {
      const socket = connectTls({
        host: address,
        port: 443,
        servername,
        rejectUnauthorized: true,
      });
      socket.setTimeout(TLS_TIMEOUT_MS);
      socket.once("secureConnect", () => {
        socket.end();
        resolve();
      });
      socket.once("timeout", () => {
        socket.destroy();
        reject(new Error("TLS check timed out."));
      });
      socket.once("error", reject);
    }),
};

export async function verifyPublicationDomain(
  input: { host: string; token: string },
  network: PublicationDomainNetwork = defaultNetwork,
): Promise<PublicationDomainCheck> {
  const host = normalizePublicationDomain(input.host);
  const expected = `aurea-verification=${input.token}`;
  let records: readonly (readonly string[])[];
  try {
    records = await withTimeout(
      network.resolveTxt(`_aurea-verification.${host}`),
      DNS_TIMEOUT_MS,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Domain check failed.";
    return {
      ownershipVerified: false,
      tlsActive: false,
      error: message.slice(0, 500),
    };
  }
  const ownershipVerified = records.some(
    (parts) => parts.join("").trim() === expected,
  );
  if (!ownershipVerified) {
    return {
      ownershipVerified: false,
      tlsActive: false,
      error: "The expected Aurea TXT record was not found.",
    };
  }

  let addresses: readonly DomainAddress[];
  try {
    addresses = await withTimeout(network.lookup(host), DNS_TIMEOUT_MS);
    if (
      addresses.length === 0 ||
      addresses.some((entry) => !isPublicIpAddress(entry.address))
    ) {
      return {
        ownershipVerified: true,
        tlsActive: false,
        error: "The domain must resolve only to public IP addresses.",
      };
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Domain lookup failed.";
    return {
      ownershipVerified: true,
      tlsActive: false,
      error: message.slice(0, 500),
    };
  }

  try {
    await withTimeout(
      network.connectTls(addresses[0]?.address ?? "", host),
      TLS_TIMEOUT_MS,
    );
    return { ownershipVerified: true, tlsActive: true, error: null };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Domain check failed.";
    return {
      ownershipVerified: true,
      tlsActive: false,
      error: message.slice(0, 500),
    };
  }
}
