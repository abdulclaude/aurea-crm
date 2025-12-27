import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { updateAppointmentChannel } from "@/inngest/channels/update-appointment";
import { decode } from "html-entities";

type UpdateAppointmentData = {
  variableName?: string;
  appointmentId: string;
};

export const updateAppointmentExecutor: NodeExecutor<UpdateAppointmentData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(updateAppointmentChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.appointmentId) {
      await publish(updateAppointmentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Update Appointment error: appointmentId is required.");
    }

    // Compile fields with Handlebars
    const appointmentId = data.appointmentId ? decode(Handlebars.compile(data.appointmentId)(context)) : undefined;

    // TODO: Implement Update Appointment logic here
    const result = await step.run("update-appointment", async () => {
      // Add implementation here
      throw new NonRetriableError("Update Appointment: Not yet implemented");
    });

    await publish(updateAppointmentChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(updateAppointmentChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
