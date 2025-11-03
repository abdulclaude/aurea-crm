import prisma from "@/lib/db";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "2s");

    await step.sleep("wait-a-moment", "2s");

    await step.sleep("wait-a-moment", "2s");

    await step.run("create-workflow", () => {
      return prisma.workflows.create({
        data: {
          name: "workflow-from-inngest",
        },
      });
    });
  }
);
