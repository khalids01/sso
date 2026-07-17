import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { env } from "@env/public";
import { authMiddleware } from "@/middleware/auth";

export const getPayment = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const response = await fetch(
      `${env.VITE_SERVER_URL}/session/payment`,
      {
        headers: getRequestHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Payment state request failed with status ${response.status}`,
      );
    }

    return response.json();
  });
