export type ResendDomainSummary = {
  id: string;
  name: string;
  status: string;
};

type ResendDomainPage = {
  domains: ResendDomainSummary[];
  hasMore: boolean;
};

type LoadResendDomainPage = (input: {
  limit: number;
  after?: string;
}) => Promise<ResendDomainPage>;

export async function findResendDomainByName(
  loadPage: LoadResendDomainPage,
  domainName: string,
): Promise<ResendDomainSummary | null> {
  const normalizedName = domainName.toLowerCase();
  let after: string | undefined;

  for (let page = 0; page < 10; page += 1) {
    const result = await loadPage({ limit: 100, after });
    const match = result.domains.find(
      (domain) => domain.name.toLowerCase() === normalizedName,
    );
    if (match) return match;
    if (!result.hasMore || result.domains.length === 0) return null;

    after = result.domains.at(-1)?.id;
    if (!after) return null;
  }

  return null;
}
