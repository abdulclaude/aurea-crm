import { NodeType } from "@/db/enums";
import type { JsonObject } from "@/db/json";

export type StudioWorkflowStarter = {
  name: string;
  initialNode: {
    type: NodeType;
    name: string;
    data: JsonObject;
  };
};

export function buildServiceBookingWorkflowStarter(service: {
  id: string;
  name: string;
}): StudioWorkflowStarter {
  return {
    name: `${service.name} booking automation`,
    initialNode: {
      type: NodeType.CLASS_BOOKED_TRIGGER,
      name: "Class booked",
      data: {
        variableName: "bookedClass",
        serviceTypeIds: [service.id],
        serviceTypeNames: [service.name],
      },
    },
  };
}

export function buildClassBookingWorkflowStarter(studioClass: {
  id: string;
  name: string;
}): StudioWorkflowStarter {
  return {
    name: `${studioClass.name} booking automation`,
    initialNode: {
      type: NodeType.CLASS_BOOKED_TRIGGER,
      name: "Class booked",
      data: {
        variableName: "bookedClass",
        classId: studioClass.id,
        className: studioClass.name,
      },
    },
  };
}

export function buildClassSeriesBookingWorkflowStarter(series: {
  id: string;
  name: string;
}): StudioWorkflowStarter {
  return {
    name: `${series.name} series booking automation`,
    initialNode: {
      type: NodeType.CLASS_BOOKED_TRIGGER,
      name: "Class booked",
      data: {
        variableName: "bookedClass",
        classSeriesIds: [series.id],
        classSeriesNames: [series.name],
      },
    },
  };
}

export function buildPricingPurchaseWorkflowStarter(pricingOption: {
  id: string;
  name: string;
}): StudioWorkflowStarter {
  return {
    name: `${pricingOption.name} purchase automation`,
    initialNode: {
      type: NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
      name: "Pricing option purchased",
      data: {
        variableName: "purchase",
        pricingOptionIds: [pricingOption.id],
        pricingOptionNames: [pricingOption.name],
      },
    },
  };
}

export function buildFormSubmissionWorkflowStarter(form: {
  id: string;
  name: string;
}): StudioWorkflowStarter {
  return {
    name: `${form.name} response automation`,
    initialNode: {
      type: NodeType.FORM_SUBMITTED_TRIGGER,
      name: "Form submitted",
      data: {
        variableName: "formSubmission",
        formId: form.id,
        formName: form.name,
      },
    },
  };
}
