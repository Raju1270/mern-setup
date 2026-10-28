import { getKafkaProducer } from "../config/kafka.js";
import { logger } from "../config/logger.js";
import { TOPIC_AUTH_EVENTS } from "../config/constants.js";
import { kafkaMessagesPublished } from "../config/metrics.js";

// CONSUMED ONLY BY realtime-service TODAY (WEBSOCKET PUSH) — notification-service DOES NOT
// SUBSCRIBE TO THIS TOPIC, SO password.reset/account.deactivated NEVER TRIGGER A CONFIRMATION
// EMAIL, ONLY A LIVE PUSH IF THE USER HAPPENS TO BE CONNECTED. THIS IS A DELIBERATE SCOPE
// BOUNDARY FOR NOW, NOT AN OVERSIGHT — A "YOUR PASSWORD WAS CHANGED" SECURITY EMAIL (SENT
// REGARDLESS OF WHETHER THE USER IS ONLINE) WOULD BE A REASONABLE FUTURE ADDITION: HAVE
// notification-service ALSO SUBSCRIBE TO auth.domain-events AND TEMPLATE THESE FOUR EVENT TYPES.
export type AuthEventType =
  | "login"
  | "mfa.toggled"
  | "password.reset"
  | "account.deactivated";

// BEST-EFFORT, UNLIKE publishOtpEmail (otpHelper.ts): A MISSED REALTIME PUSH DEGRADES
// GRACEFULLY (THE USER JUST DOESN'T GET A LIVE NOTIFICATION) — THE UNDERLYING OPERATION
// (LOGIN, MFA TOGGLE, ETC.) ALREADY SUCCEEDED IN THE DB BY THE TIME THIS IS CALLED, SO A
// KAFKA FAILURE HERE MUST NEVER FAIL THE REQUEST.
export const publishAuthEvent = async (
  type: AuthEventType,
  userId: string,
  extra: Record<string, unknown> = {}
): Promise<void> => {
  try {
    await getKafkaProducer().send({
      topic: TOPIC_AUTH_EVENTS,
      messages: [
        {
          key: userId,
          value: JSON.stringify({ type, userId, timestamp: new Date().toISOString(), ...extra }),
        },
      ],
    });
    kafkaMessagesPublished.inc({ topic: TOPIC_AUTH_EVENTS, status: "success" });
  } catch (err) {
    kafkaMessagesPublished.inc({ topic: TOPIC_AUTH_EVENTS, status: "failure" });
    logger.error({ err, type, userId }, "Failed to publish auth event");
  }
};
