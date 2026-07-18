"use client";

import { FileCheck2 } from "lucide-react";
import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import {
  FormSubmittedTriggerDialog,
  type FormSubmittedTriggerFormValues,
} from "./dialog";

type FormSubmittedNode = Node<Partial<FormSubmittedTriggerFormValues>>;

export const FormSubmittedTriggerNode: React.FC<NodeProps<FormSubmittedNode>> =
  memo((props) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const save = (values: FormSubmittedTriggerFormValues) =>
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...values,
                  formId: values.formId || null,
                  formName: values.formId ? values.formName : undefined,
                  requireEmailMarketingConsent:
                    values.requireEmailMarketingConsent,
                  requireSmsMarketingConsent:
                    values.requireSmsMarketingConsent,
                },
              }
            : node,
        ),
      );

    return (
      <>
        <FormSubmittedTriggerDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={save}
          defaultValues={{
            formId: props.data?.formId ?? "",
            formName: props.data?.formName,
            intent: props.data?.intent,
            requireEmailMarketingConsent:
              props.data?.requireEmailMarketingConsent ?? false,
            requireSmsMarketingConsent:
              props.data?.requireSmsMarketingConsent ?? false,
            variableName: props.data?.variableName ?? "formSubmission",
          }}
        />
        <BaseTriggerNode
          {...props}
          icon={FileCheck2}
          name={
            props.data?.intent === "NEWSLETTER"
              ? "Subscribed to newsletter"
              : "Form submitted"
          }
          description={
            props.data?.formId
              ? props.data?.intent === "NEWSLETTER"
                ? `When ${props.data.formName ?? "the selected newsletter form"} is submitted`
                : `When ${props.data.formName ?? "the selected form"} is submitted`
              : props.data?.intent === "NEWSLETTER"
                ? "Choose the newsletter signup form"
              : "When any Aurea form is submitted"
          }
          onSettings={() => setOpen(true)}
          onDoubleClick={() => setOpen(true)}
        />
      </>
    );
  });
