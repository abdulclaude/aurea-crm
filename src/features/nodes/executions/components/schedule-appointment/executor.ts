import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { scheduleAppointmentChannel } from "@/inngest/channels/schedule-appointment";
import { decode } from "html-entities";

type ScheduleAppointmentData = {
  variableName?: string;
  title: string;
  startTime: string;
  endTime: string;
};

export const scheduleAppointmentExecutor: NodeExecutor<ScheduleAppointmentData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(scheduleAppointmentChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.title) {
      await publish(scheduleAppointmentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Schedule Appointment error: title is required.");
    }

    if (!data.startTime) {
      await publish(scheduleAppointmentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Schedule Appointment error: startTime is required.");
    }

    if (!data.endTime) {
      await publish(scheduleAppointmentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Schedule Appointment error: endTime is required.");
    }

    // Compile fields with Handlebars
    const title = data.title ? decode(Handlebars.compile(data.title)(context)) : undefined;
    const startTime = data.startTime ? decode(Handlebars.compile(data.startTime)(context)) : undefined;
    const endTime = data.endTime ? decode(Handlebars.compile(data.endTime)(context)) : undefined;

    // TODO: Implement Schedule Appointment logic here
    const result = await step.run("schedule-appointment", async () => {
      // Add implementation here
      throw new NonRetriableError("Schedule Appointment: Not yet implemented");
    });

    await publish(scheduleAppointmentChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(scheduleAppointmentChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
