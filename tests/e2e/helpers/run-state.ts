import fs from "node:fs";
import path from "node:path";
import { e2eEnv } from "./environment";

export type RunState = {
  runId: string;
  runPrefix: string;
  lockToken?: string;
  applicationIds: string[];
  clientIds: string[];
  membershipIds: string[];
  oauthFixture?: {
    applicationId: string;
    memberId: string;
    clientId: string;
    redirectUri: string;
    demoRedirectUri: string;
    revocationMemberId: string;
    revocationUserId: string;
    revocationSubject: string;
  };
};

const stateDirectory = path.join(e2eEnv.e2eRoot, ".state");
const statePath = path.join(stateDirectory, `${e2eEnv.runId}.json`);

export function readRunState(): RunState {
  if (!fs.existsSync(statePath)) {
    return {
      runId: e2eEnv.runId,
      runPrefix: e2eEnv.runPrefix,
      applicationIds: [],
      clientIds: [],
      membershipIds: [],
    };
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8")) as RunState;
}

export function updateRunState(update: (state: RunState) => void) {
  const state = readRunState();
  update(state);
  fs.mkdirSync(stateDirectory, { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  return state;
}

export function removeRunState() {
  fs.rmSync(statePath, { force: true });
}
