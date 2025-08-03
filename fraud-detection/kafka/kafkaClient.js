import chalk from 'chalk';
import { logLevel } from 'kafkajs';
import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'fraud-detector',
    brokers: [process.env.KAFKA_BROKER],
    logLevel: logLevel.NOTHING
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'fraud-detector-group' });

export async function connectKafka() {
    try {
        await producer.connect();
        await consumer.connect();
      
    } catch(error) {
        console.error(chalk.red('Error connecting to Kafka:', error));
        throw error;
    }

}

consumer.on(consumer.events.DISCONNECT, () => {
  console.warn(chalk.yellow('Consumer disconnected'));
});
consumer.on(consumer.events.CRASH, (e) => {
  console.error(chalk.red('Consumer crashed:', e.payload?.error));
});

export async function disconnectKafka() {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log(chalk.green('Kafka disconnected gracefully.'));
  } catch (error) {
    console.error(chalk.red('Error during Kafka disconnection:', error));
  }
}