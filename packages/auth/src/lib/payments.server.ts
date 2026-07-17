import { Polar } from "@polar-sh/sdk";
import { env, getRequiredPolarEnv } from "../../../env/src/env.server";
import { isMissingPolarCustomerError } from "./polar-error";

export const polarClient = env.ENABLE_POLAR
  ? (() => {
      const polarEnv = getRequiredPolarEnv();

      return new Polar({
        accessToken: polarEnv.POLAR_ACCESS_TOKEN,
        server: polarEnv.POLAR_MODE,
      });
    })()
  : (undefined as unknown as Polar);

export async function getPolarCustomerState(userId: string) {
  try {
    return await polarClient.customers.getStateExternal({
      externalId: userId,
    });
  } catch (error) {
    if (isMissingPolarCustomerError(error)) {
      return null;
    }

    throw error;
  }
}
