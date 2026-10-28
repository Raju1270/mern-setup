import { Kafka, type Consumer, type EachMessagePayload } from "kafkajs";
import {
  DEFAULT_KAFKA_BROKERS,
  KAFKA_CLIENT_ID,
  KAFKA_CONSUMER_GROUP_ID,
  TOPIC_AUTH_EVENTS,
} from "./constants.js";
import { logger } from "./logger.js";

const brokers = (process.env.KAFKA_BROKERS || DEFAULT_KAFKA_BROKERS).split(",");
const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers, logCreator: () => () => {} });

let consumer: Consumer | null = null;

// EXPLICITLY PROVISIONS THE TOPIC VIA THE ADMIN API — SEE server/config/kafka.ts FOR WHY
// (auto.create.topics.enable ONLY TRIGGERS ON PRODUCE, NOT ON CONSUMER subscribe).
// IDEMPOTENT: A NO-OP IF server ALREADY CREATED IT.
const ensureTopics = async (): Promise<void> => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [{ topic: TOPIC_AUTH_EVENTS, numPartitions: 1, replicationFactor: 1 }],
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
    await consumer.subscribe({ topic: TOPIC_AUTH_EVENTS, fromBeginning: false });
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
