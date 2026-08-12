export type {
  BetterAuthClientLike,
  BetterAuthSsoActions,
  CreateSsoProviderOptions,
  SsoClientMetadata,
  SsoAuthMethod,
  SsoEndpoints,
  SsoProvider,
  SsoBetterAuthBootstrap,
  SsoBetterAuthIntegration,
  SsoBetterAuthIntegrationOptions,
  SsoPublicConfig,
  SsoSession,
  SsoTokenResponse,
  SsoUser,
} from "../index.js";

export type {
  SsoClient,
  SsoClientOptions,
  BrowserSsoClientOptions,
  SsoLoginOptions,
  SsoLogoutOptions,
} from "../client/index.js";

export type {
  CreateSsoAuthorizationOptions,
  CreateSsoServerOptions,
  FinishSsoAuthorizationOptions,
  SsoAuthorizationFlow,
  SsoCookieOptions,
  SsoServer,
  SsoServerPaths,
  SsoSessionRequest,
  SsoSignInContext,
  StandaloneSsoBootstrap,
  StandaloneSsoClientConfig,
  VerifiedSsoAuthorization,
  VerifiedSsoAccessToken,
  VerifiedSsoIdentity,
  SsoAccessTokenVerifier,
  VerifySsoAccessTokenOptions,
  VerifySsoIdTokenOptions,
} from "../server/index.js";

export type {
  BetterAuthReactClient,
  BetterAuthSessionHook,
  BetterAuthSessionLike,
  BetterAuthSsoContextValue,
  BetterAuthSsoProviderProps,
  BetterAuthSsoReact,
  SsoDisplayUser,
  SsoAuthProps,
  SsoAuthDialogProps,
  SsoContextValue,
  SsoMenuItem,
  SsoProviderProps,
  SsoSignInButtonProps,
  SsoStatus,
  SsoUserMenuProps,
} from "../react/index.js";

export type { NextBetterAuthServerLike } from "../next/index.js";
export type { ElysiaSsoOptions } from "../elysia/index.js";

export type {
  NodeHeaderValue,
  NodeRequestLike,
  NodeResponseLike,
} from "../node/index.js";
