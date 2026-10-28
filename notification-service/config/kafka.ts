import { Kafka, type Consumer, type EachMessagePayload } from "kafkajs";
import {
  DEFAULT_KAFKA_BROKERS,
  KAFKA_CLIENT_ID,
  KAFKA_CONSUMER_GROUP_ID,
  TOPIC_OTP_EMAIL,
} from "./constants.js";
import { logger } from "./logger.js";

const brokers = (process.env.KAFKA_BROKERS || DEFAULT_KAFKA_BROKERS).split(",");
const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers, logCreator: () => () => {} });

let consumer: Consumer | null = null;

// EXPLICITLY PROVISIONS TOPICS VIA THE ADMIN API — A CONSUMER subscribe() TO A TOPIC THAT WAS
// NEVER PRODUCED TO (E.G. THIS SERVICE STARTS BEFORE auth-service EVER PUBLISHES) THROWS
// UNKNOWN_TOPIC_OR_PARTITION INSTEAD OF AUTO-CREATING, EVEN WITH auto.create.topics.enable.
const ensureTopics = async (): Promise<void> => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [{ topic: TOPIC_OTP_EMAIL, numPartitions: 1, replicationFactor: 1 }],
    });
  } finally {
    await admin.disconnect();
  }
};

export const connectKafkaConsumer = async (
  onMessage: (payload: EachMessagePayload) => Promise<void>
): Promise<void> => {
  try {
    await ensureTopics();

    consumer = kafka.consumer({ groupId: KAFKA_CONSUMER_GROUP_ID });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC_OTP_EMAIL, fromBeginning: false });
    await consumer.run({ eachMessage: onMessage });

    logger.info("✓ Kafka consumer connected and subscribed");
  } catch (err: any) {
    logger.error({ err }, "✗ Kafka consumer connection failed");
    process.exit(1);
  }
};

export const closeKafkaConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    logger.info("Kafka consumer disconnected");
  }
};
