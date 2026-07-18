export const oauthProviderHealthErrorCodes = {
  reauthorizationRequired: "OAUTH_REAUTHORIZATION_REQUIRED",
  scopesMissing: "OAUTH_SCOPES_MISSING",
  tokenTemporarilyUnavailable: "OAUTH_TOKEN_TEMPORARILY_UNAVAILABLE",
} as const;

export type OAuthProviderHealthFailure = {
  kind: "REAUTHORIZATION_REQUIRED" | "TRANSIENT";
  errorCode:
    | (typeof oauthProviderHealthErrorCodes)["reauthorizationRequired"]
    | (typeof oauthProviderHealthErrorCodes)["scopesMissing"]
    | (typeof oauthProviderHealthErrorCodes)["tokenTemporarilyUnavailable"];
};

type OAuthProviderHealthFailureState = {
  status: "DEGRADED" | "DISCONNECTED";
  lastErrorCode: OAuthProviderHealthFailure["errorCode"];
  lastHealthCheckAt: Date;
};

type OAuthProviderHealthSuccessState = {
  status: "ACTIVE";
  lastErrorCode: null;
  lastHealthCheckAt: Date;
  lastSuccessAt: Date;
};

const REAUTHORIZATION_MARKERS = [
  "access_denied",
  "account_not_found",
  "consent_required",
  "interaction_required",
  "invalid_grant",
  "invalid_refresh_token",
  "invalid_token",
  "login_required",
  "refresh_token_expired",
  "refresh_token_revoked",
  "unauthorized_client",
] as const;

const REAUTHORIZATION_MESSAGES = [
  "account not found",
  "refresh token expired",
  "refresh token has expired",
  "refresh token revoked",
  "refresh token has been revoked",
] as const;

type OAuthErrorEvidence = {
  codes: string[];
  messages: string[];
  statusCodes: number[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function collectOAuthErrorEvidence(error: unknown): OAuthErrorEvidence {
  const evidence: OAuthErrorEvidence = {
    codes: [],
    messages: [],
    statusCodes: [],
  };
  const queue: Array<{ value: unknown; depth: number }> = [
    { value: error, depth: 0 },
  ];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth > 5 || visited.has(current.value)) continue;
    visited.add(current.value);
    const record = asRecord(current.value);
    if (!record) continue;

    for (const key of ["code", "error", "errorCode"] as const) {
      if (typeof record[key] === "string") {
        evidence.codes.push(record[key].toLowerCase());
      }
    }
    for (const key of [
      "message",
      "error_description",
      "errorDescription",
    ] as const) {
      if (typeof record[key] === "string") {
        evidence.messages.push(record[key].toLowerCase());
      }
    }
    for (const key of ["status", "statusCode", "httpStatus"] as const) {
      if (typeof record[key] === "number") {
        evidence.statusCodes.push(record[key]);
      }
    }
    for (const key of ["cause", "body", "data", "response"] as const) {
      if (record[key] !== undefined) {
        queue.push({ value: record[key], depth: current.depth + 1 });
      }
    }
    if (typeof record.error === "object" && record.error !== null) {
      queue.push({ value: record.error, depth: current.depth + 1 });
    }
  }

  return evidence;
}

export function classifyOAuthProviderTokenFailure(
  error: unknown,
): OAuthProviderHealthFailure {
  const evidence = collectOAuthErrorEvidence(error);
  const requiresReauthorization =
    evidence.codes.some((code) =>
      REAUTHORIZATION_MARKERS.some((marker) => code.includes(marker)),
    ) ||
    evidence.messages.some((message) =>
      REAUTHORIZATION_MESSAGES.some((marker) => message.includes(marker)),
    ) ||
    evidence.statusCodes.some((statusCode) =>
      statusCode === 401 || statusCode === 403,
    );

  if (requiresReauthorization) {
    return {
      kind: "REAUTHORIZATION_REQUIRED",
      errorCode: oauthProviderHealthErrorCodes.reauthorizationRequired,
    };
  }

  return {
    kind: "TRANSIENT",
    errorCode: oauthProviderHealthErrorCodes.tokenTemporarilyUnavailable,
  };
}

export function getOAuthProviderFailureHealthState(
  failure: OAuthProviderHealthFailure,
  checkedAt: Date,
): OAuthProviderHealthFailureState {
  return {
    status:
      failure.kind === "REAUTHORIZATION_REQUIRED"
        ? "DISCONNECTED"
        : "DEGRADED",
    lastErrorCode: failure.errorCode,
    lastHealthCheckAt: checkedAt,
  };
}

export function getOAuthProviderSuccessHealthState(
  checkedAt: Date,
): OAuthProviderHealthSuccessState {
  return {
    status: "ACTIVE",
    lastErrorCode: null,
    lastHealthCheckAt: checkedAt,
    lastSuccessAt: checkedAt,
  };
}

export function classifyOAuthProviderResponseFailure(
  status: number,
): OAuthProviderHealthFailure | null {
  if (status === 401 || status === 403) {
    return {
      kind: "REAUTHORIZATION_REQUIRED",
      errorCode: oauthProviderHealthErrorCodes.reauthorizationRequired,
    };
  }
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return {
      kind: "TRANSIENT",
      errorCode: oauthProviderHealthErrorCodes.tokenTemporarilyUnavailable,
    };
  }
  return null;
}
