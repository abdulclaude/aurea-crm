import type { ReactElement } from "react";

import {
  generatePublishedFunnelMarkup,
  type FunnelRenderPolicy,
  type FunnelRenderPolicyInput,
  type PublishedPageData,
} from "./published-funnel-renderer";

type PublishedFunnelDocumentProps = {
  data: PublishedPageData;
  policy: FunnelRenderPolicy | FunnelRenderPolicyInput;
};

export function PublishedFunnelDocument({
  data,
  policy,
}: PublishedFunnelDocumentProps): ReactElement {
  const markup = generatePublishedFunnelMarkup(data, policy);

  return (
    <>
      <style
        precedence="aurea-funnel"
        dangerouslySetInnerHTML={{ __html: markup.styles }}
      />
      <div
        data-aurea-funnel-page
        dangerouslySetInnerHTML={{ __html: markup.content }}
      />
      {markup.runtime ? (
        <div
          aria-hidden="true"
          data-aurea-funnel-runtime
          style={{ display: "contents" }}
          dangerouslySetInnerHTML={{ __html: markup.runtime }}
        />
      ) : null}
    </>
  );
}
