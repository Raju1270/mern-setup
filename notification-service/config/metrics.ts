import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const kafkaMessagesConsumed = new client.Counter({
  name: "kafka_messages_consumed_total",
  help: "Total number of Kafka messages consumed",
  labelNames: ["topic", "status"],
  registers: [registry],
});

export const otpEmailsSent = new client.Counter({
  name: "otp_emails_sent_total",
  help: "Total number of OTP emails successfully sent",
  registers: [registry],
});
