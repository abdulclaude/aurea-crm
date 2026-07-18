import type { DeviceType } from "@/db/enums";

import { renderBasicBlock } from "./published-funnel-basic-blocks";
import { renderConversionBlock } from "./published-funnel-conversion-blocks";
import { getBlockClassName } from "./published-funnel-styles";
import type {
  FunnelRenderPolicy,
  PublishedFunnelBlock,
} from "./published-funnel-types";

export function renderBlockTree(
  blocks: PublishedFunnelBlock[],
  parentId: string | null = null,
  deviceType: DeviceType = "DESKTOP",
  policy: FunnelRenderPolicy,
): string {
  return blocks
    .filter((block) => block.visible && block.parentBlockId === parentId)
    .sort((first, second) => first.order - second.order)
    .map((block) => {
      const props = block.props as Record<string, unknown>;
      const childrenHtml = renderBlockTree(
        blocks,
        block.id,
        deviceType,
        policy,
      );
      const input = {
        block,
        childrenHtml,
        className: getBlockClassName(block.id),
        policy,
        props,
      };
      return (
        renderBasicBlock(input) ??
        renderConversionBlock(input) ??
        `<div class="${input.className}">${childrenHtml}</div>`
      );
    })
    .join("");
}
