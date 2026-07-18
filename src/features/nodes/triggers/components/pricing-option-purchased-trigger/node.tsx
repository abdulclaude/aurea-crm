"use client";

import { ShoppingBag } from "lucide-react";
import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import {
  PricingOptionPurchasedTriggerDialog,
  type PricingOptionPurchasedTriggerFormValues,
} from "./dialog";

type Data = {
  pricingOptionIds?: string[];
  pricingOptionNames?: string[];
  variableName?: string;
};
type PricingOptionPurchasedNode = Node<Data>;

export const PricingOptionPurchasedTriggerNode: React.FC<
  NodeProps<PricingOptionPurchasedNode>
> = memo((props) => {
  const [open, setOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const save = (values: PricingOptionPurchasedTriggerFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                pricingOptionIds: values.pricingOptionIds,
                pricingOptionNames: values.pricingOptionNames,
                variableName: values.variableName,
              },
            }
          : node,
      ),
    );
  };
  const count = props.data?.pricingOptionIds?.length ?? 0;

  return (
    <>
      <PricingOptionPurchasedTriggerDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={save}
        defaultValues={{
          pricingOptionIds: props.data?.pricingOptionIds ?? [],
          pricingOptionNames: props.data?.pricingOptionNames ?? [],
          variableName: props.data?.variableName ?? "purchase",
        }}
      />
      <BaseTriggerNode
        {...props}
        icon={ShoppingBag}
        name="Pricing option purchased"
        description={
          count > 0
            ? count === 1
              ? `When ${props.data?.pricingOptionNames?.[0] ?? "the selected pricing option"} is purchased`
              : `When any of ${count} selected pricing options are purchased`
            : "When any pricing option is purchased"
        }
        onSettings={() => setOpen(true)}
        onDoubleClick={() => setOpen(true)}
      />
    </>
  );
});
