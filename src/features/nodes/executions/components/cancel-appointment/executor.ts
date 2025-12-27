import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { cancelAppointmentChannel } from "@/inngest/channels/cancel-appointment";
import { decode } from "html-entities";

type CancelAppointmentData = {
  variableName?: string;
  appointmentId: string;
};

export const cancelAppointmentExecutor: NodeExecutor<CancelAppointmentData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(cancelAppointmentChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.appointmentId) {
      await publish(cancelAppointmentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Cancel Appointment error: appointmentId is required.");
    }

    // Compile fields with Handlebars
    const appointmentId = data.appointmentId ? decode(Handlebars.compile(data.appointmentId)(context)) : undefined;

    // TODO: Implement Cancel Appointment logic here
    const result = await step.run("cancel-appointment", async () => {
      // Add implementation here
      throw new NonRetriableError("Cancel Appointment: Not yet implemented");
    });

    await publish(cancelAppointmentChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(cancelAppointmentChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
