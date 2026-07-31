import Elysia from "elysia";
import { usersController } from "./admin/users/users.controller";
import { adminInvitationsController } from "./admin/invitations/invitations.controller";
import { metadataController } from "./admin/metadata/metadata.controller";
import { authController } from "./auth/auth.controller";
import { sessionController } from "./session/session.controller";
import { notificationsController } from "./notifications/notifications.controller";
import { feedbackController } from "./feedback/feedback.controller";
import { polarController } from "./polar/polar.controller";
import { rateLimitController } from "./rate-limit/rate-limit.controller";
import { invitationsController } from "./invitations/invitations.controller";
import { adminApplicationUsageController } from "./admin/application-usage/application-usage.controller";
import { adminActivityController } from "./admin/activity/activity.controller";
import { adminWebhooksController } from "./admin/webhooks/webhooks.controller";
import { rolesController } from "./admin/roles/roles.controller";
import { applicationsController } from "./admin/applications/applications.controller";
import { oauthConnectionsController } from "./admin/oauth-connections/oauth-connections.controller";
import { emailConnectionsController } from "./admin/email-connections/email-connections.controller";
import { platformAuthSettingsController } from "./admin/settings/platform-auth.controller";

export const app = new Elysia()
  .use(authController)
  .use(sessionController)
  .use(usersController)
  .use(rolesController)
  .use(applicationsController)
  .use(oauthConnectionsController)
  .use(emailConnectionsController)
  .use(platformAuthSettingsController)
  .use(adminInvitationsController)
  .use(metadataController)
  .use(rateLimitController)
  .use(adminApplicationUsageController)
  .use(adminActivityController)
  .use(adminWebhooksController)
  .use(notificationsController)
  .use(feedbackController)
  .use(polarController)
  .use(invitationsController);
