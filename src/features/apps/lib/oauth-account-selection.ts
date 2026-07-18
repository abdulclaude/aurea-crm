export type OAuthLinkedAccountCandidate = {
  id: string;
  accountId: string;
  scopes: string[];
};

export type OAuthScopedAccountCandidate = {
  id: string;
  externalAccountId: string | null;
  grant: { oauthAccountId: string } | null;
};

export type OAuthCatalogAccountCandidate = {
  locationId: string | null;
  inheritToLocations: boolean;
  isDefault: boolean;
};

export type OAuthAccountSelection =
  | {
      kind: "existing";
      account: OAuthScopedAccountCandidate;
      linkedAccount: OAuthLinkedAccountCandidate;
    }
  | { kind: "new"; linkedAccount: OAuthLinkedAccountCandidate }
  | { kind: "missing"; account: OAuthScopedAccountCandidate | null }
  | { kind: "ambiguous" };

function matchingLinkedAccount(
  account: OAuthScopedAccountCandidate,
  linkedAccounts: readonly OAuthLinkedAccountCandidate[],
) {
  return (
    linkedAccounts.find(
      (linked) => linked.id === account.grant?.oauthAccountId,
    ) ??
    linkedAccounts.find(
      (linked) => linked.accountId === account.externalAccountId,
    ) ??
    null
  );
}

export function selectOAuthAccountBinding(input: {
  scopedAccounts: readonly OAuthScopedAccountCandidate[];
  linkedAccounts: readonly OAuthLinkedAccountCandidate[];
  providerAccountId?: string;
  linkedAccountId?: string;
}): OAuthAccountSelection {
  const selectedAccount = input.providerAccountId
    ? (input.scopedAccounts.find(
        (account) => account.id === input.providerAccountId,
      ) ?? null)
    : null;
  const selectedLinkedAccount = input.linkedAccountId
    ? (input.linkedAccounts.find(
        (account) => account.id === input.linkedAccountId,
      ) ?? null)
    : null;

  if (input.providerAccountId && !selectedAccount) return { kind: "ambiguous" };
  if (input.linkedAccountId && !selectedLinkedAccount) {
    return { kind: "ambiguous" };
  }

  if (selectedAccount) {
    const linkedAccount =
      selectedLinkedAccount ??
      matchingLinkedAccount(selectedAccount, input.linkedAccounts);
    if (!linkedAccount) return { kind: "missing", account: selectedAccount };
    if (
      selectedAccount.externalAccountId &&
      selectedAccount.externalAccountId !== linkedAccount.accountId
    ) {
      return { kind: "ambiguous" };
    }
    return { kind: "existing", account: selectedAccount, linkedAccount };
  }

  if (selectedLinkedAccount) {
    const matchingAccount = input.scopedAccounts.find(
      (account) =>
        account.grant?.oauthAccountId === selectedLinkedAccount.id ||
        account.externalAccountId === selectedLinkedAccount.accountId,
    );
    return matchingAccount
      ? {
          kind: "existing",
          account: matchingAccount,
          linkedAccount: selectedLinkedAccount,
        }
      : { kind: "new", linkedAccount: selectedLinkedAccount };
  }

  const matches = input.scopedAccounts.flatMap((account) => {
    const linkedAccount = matchingLinkedAccount(account, input.linkedAccounts);
    return linkedAccount ? [{ account, linkedAccount }] : [];
  });
  if (matches.length === 1) {
    return { kind: "existing", ...matches[0] };
  }
  if (input.scopedAccounts.length === 0 && input.linkedAccounts.length === 1) {
    return { kind: "new", linkedAccount: input.linkedAccounts[0] };
  }
  if (input.scopedAccounts.length === 1 && input.linkedAccounts.length === 0) {
    return { kind: "missing", account: input.scopedAccounts[0] };
  }
  if (input.scopedAccounts.length === 0 && input.linkedAccounts.length === 0) {
    return { kind: "missing", account: null };
  }
  if (
    input.scopedAccounts.length === 1 &&
    input.linkedAccounts.length === 1 &&
    !input.scopedAccounts[0].externalAccountId &&
    !input.scopedAccounts[0].grant
  ) {
    return {
      kind: "existing",
      account: input.scopedAccounts[0],
      linkedAccount: input.linkedAccounts[0],
    };
  }
  return { kind: "ambiguous" };
}

export function redactOAuthAccountIdentifier(value: string): string {
  const normalized = value.trim();
  const at = normalized.indexOf("@");
  if (at > 0) {
    return `${normalized[0]}***${normalized.slice(at)}`;
  }
  return `Account ending ${normalized.slice(-4).padStart(4, "*")}`;
}

export function selectOAuthCatalogAccount<
  T extends OAuthCatalogAccountCandidate,
>(candidates: readonly T[], locationId: string | null): T | null {
  const exact = candidates.filter(
    (candidate) => candidate.locationId === locationId,
  );
  const inherited = locationId
    ? candidates.filter(
        (candidate) =>
          candidate.locationId === null && candidate.inheritToLocations,
      )
    : [];
  const tier = exact.length > 0 ? exact : inherited;
  return tier.find((candidate) => candidate.isDefault) ?? tier[0] ?? null;
}
