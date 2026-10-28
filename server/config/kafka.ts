import { Kafka, type Producer } from "kafkajs";
import {
  DEFAULT_KAFKA_BROKERS,
  KAFKA_CLIENT_ID,
  TOPIC_AUTH_EVENTS,
  TOPIC_OTP_EMAIL,
} from "./constants.js";
import { logger } from "./logger.js";

const brokers = (process.env.KAFKA_BROKERS || DEFAULT_KAFKA_BROKERS).split(",");
const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers, logCreator: () => () => {} });

let producer: Producer | null = null;

// EXPLICITLY PROVISIONS TOPICS VIA THE ADMIN API INSTEAD OF RELYING ON auto.create.topics.enable —
// A CONSUMER SUBSCRIBING BEFORE ANYTHING WAS EVER PRODUCED CRASHES ON A TOPIC THAT ONLY
// AUTO-CREATES ON PRODUCE, NOT ON SUBSCRIBE.
const ensureTopics = async (): Promise<void> => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [
        { topic: TOPIC_OTP_EMAIL, numPartitions: 1, replicationFactor: 1 },
        { topic: TOPIC_AUTH_EVENTS, numPartitions: 1, replicationFactor: 1 },
      ],
    });
  } finally {
    await admin.disconnect();
  }
};

export const connectKafkaProducer = async (): Promise<void> => {
  try {
    await ensureTopics();

    producer = kafka.producer();
    await producer.connect();

    logger.info("✓ Kafka producer connected");
  } catch (err: any) {
    logger.error({ err }, "✗ Kafka producer connection failed");
    process.exit(1);
  }
};

// THROWS IF CALLED BEFORE connectKafkaProducer() DURING STARTUP.
export const getKafkaProducer = (): Producer => {
  if (!producer) throw new Error("Kafka producer not initialized");
  return producer;
};

export const closeKafkaProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    producer = null;
    logger.info("Kafka producer disconnected");
  }
};
