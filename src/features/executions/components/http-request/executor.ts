import Handlebars from "handlebars";

import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";

import ky, { type Options as KyOptions } from "ky";
import { httpRequestChannel } from "@/inngest/channels/http-request";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type HttpRequestData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  // TODO: publish loading state for http request

  await publish(httpRequestChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("http-request", async () => {
      if (!data.endpoint) {
        // TODO: publish 'error' state for http req

        await publish(httpRequestChannel().status({ nodeId, status: "error" }));

        throw new NonRetriableError(
          "HTTP Request Node: No endpoint configured."
        );
      }

      if (!data.variableName) {
        // TODO: publish 'error' state for http req

        await publish(httpRequestChannel().status({ nodeId, status: "error" }));

        throw new NonRetriableError(
          "HTTP Request Node: No variable name configured."
        );
      }

      if (!data.variableName) {
        // TODO: publish 'error' state for http req

        await publish(httpRequestChannel().status({ nodeId, status: "error" }));

        throw new NonRetriableError("HTTP Request Node: No method configured.");
      }

      const endpoint = Handlebars.compile(data.endpoint)(context);
      const method = data.method || "GET";

      console.log("ENDPOINT:", { endpoint });

      const options: KyOptions = { method };

      if (["POST", "PUT", "PATCH"].includes(method)) {
        const resolved = Handlebars.compile(data.body || "{}")(context);
        JSON.parse(resolved);

        options.body = resolved;

        options.headers = {
          "Content-Type": "application/json",
        };
      }

      const response = await ky(endpoint, options);
      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json().catch(() => response.text())
        : await response.text();

      const responsePayload = {
        httpResponse: {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        },
      };

      return {
        ...context,
        [data.variableName]: responsePayload,
      };

      // fall back to direct httpResponse for backwards compatability
    });

    await publish(httpRequestChannel().status({ nodeId, status: "success" }));

    return result;
  } catch (error) {
    await publish(httpRequestChannel().status({ nodeId, status: "error" }));
    throw error;
  }

  // TODO: publish success state for http request
};
