import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";

import { isExpectedSsrCancellation } from "./lib/ssr-cancellation";

const fetch = createStartHandler(async (context) => {
  try {
    return await defaultStreamHandler(context);
  } catch (error) {
    if (isExpectedSsrCancellation(error, context.request.signal)) {
      return new Response(null, { status: 499 });
    }

    throw error;
  }
});

export type ServerEntry = {
  fetch: RequestHandler<Register>;
};

export default { fetch } satisfies ServerEntry;
