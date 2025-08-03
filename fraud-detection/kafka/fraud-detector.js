import winston from 'winston';
import Queue from 'bull';
import NodeCache from 'node-cache'
import chalk from 'chalk';
import { addFraud } from '../services/fraudsService.js';
import { format } from 'winston';
import { consumer, producer, kafka } from './kafkaClient.js';

const retryQueue = new Queue('retry-queue', {
  limiter: {
    groupKey: 'transactionId',
    max: 1,
    duration: 1000,
  },
  settings: {
    retryProcessDelay: 1000,
  }
});


let timedTxns = [];
const dedupeCache = new NodeCache({ stdTTL: 120, checkperiod: 135 });

// Logging with Winston
const logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => {
          let coloredMessage = '';
          switch (info.level) {
            case 'info':
              coloredMessage = chalk.blue(info.message);
              break;
            case 'warn':
              coloredMessage = chalk.yellow(info.message);
              break;
            case 'error':
              coloredMessage = chalk.red.bold(info.message);
              break;
            default:
              coloredMessage = info.message;
          }
          return `${chalk.gray(info.timestamp)} [${info.level}] ${coloredMessage}`;
        })
    ),
    transports: [new winston.transports.Console()]
});

// Start consumer and fraud check logic
async function run() {
    await consumer.subscribe({ topic: 'transactions', fromBeginning: true });

    // Process retry jobs
    retryQueue.process(async (job, done) => {
        try {
            const message = job.data;
            console.log(`Retrying message: ${message.value}`);

            // Simulate message processing
            const isProcessed = await processMessage(message);
            if (isProcessed) {
                console.log(`Message processed successfully: ${message.value}`);
                done();
            } else {
                console.log(`Attempt ${job.attemptsMade}`);
                throw new Error(`Failed to process message after retries: ${message.value}`);
            }
        } catch (error) {
            console.error(`Retry job failed: ${error.message}`);
            done(error);
        }
    });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                console.log(`Processing message: ${message.value.toString()}`);

                const isProcessed = await processMessage(message);

                if (!isProcessed) {
                    console.log(`Failed processing message: ${message.value}`);
                    retryQueue.add({ value: message.value.toString() }, {
                        attempts: 5,         
                        backoff: { type: 'exponential', delay: 5000 },
                        limiter: {
                            groupKey: 'transactionId',
                            max: 1,
                            duration: 1000,
                        },
                        settings: {
                            retryProcessDelay: 1000,
                        }
                    });
                }
            } catch (error) {
                console.error(`Error while processing message: ${error.message}`);
            }
        }
    });
}

// Process Messages
async function processMessage(message) {
    try {
        const tx = JSON.parse(message.value.toString());
        logger.info(`Received transaction: ${JSON.stringify(tx)}`);

        // Deduplication Logic
        const dedupeKey = `tx:${tx.transactionId}`;
        if (dedupeCache.get(dedupeKey)) {
            logger.info(chalk.cyan(`Duplicate transaction ${tx.transactionId}, skipping`));
            return true;
        }
        dedupeCache.set(dedupeKey, true); // Mark as processed (for TTL duration)

        const currentTime = Date.now();
        timedTxns.push({ ...tx, currentTime });
        // Remove timedTxns older than 10 seconds
        timedTxns = timedTxns.filter(
            (transaction) => currentTime - transaction.currentTime <= 10000
        );


        if (tx.amount > 5000 && tx.location != 'USA') {
            const reason = 'Amount > $5000 and not in USA';
            const flagged = {
                ...tx,
                reason,
                flaggedAt: new Date().toISOString()
            };
            delete flagged.amount; delete flagged.location;

            logger.warn(`Flagged: ${JSON.stringify(flagged)}`);
            await addFraud(flagged);

        } else if (timedTxns.filter(t => t.userId === tx.userId).length > 1) {
            const recentTxns = timedTxns.filter(t => t.userId === tx.userId);
            for (let index = 0; index < recentTxns.length; index++) {
                const txn = recentTxns[index];
                const reason = 'Multiple transactions in 10 seconds';
                const flagged = {
                    ...txn,
                    reason,
                    flaggedAt: new Date().toISOString()
                };
                delete flagged.amount; delete flagged.location;
    
                logger.warn(`Flagged: ${JSON.stringify(flagged)}`);
                await addFraud(flagged);

            }
            recentTxns.map(txns => {
            })
        } else if (tx.amount % 1000 == 0) {
            const reason = 'Amount is a multiple of 1000';
            const flagged = {
                ...tx,
                reason,
                flaggedAt: new Date().toISOString()
            };
            delete flagged.amount; delete flagged.location;

            logger.warn(`Flagged: ${JSON.stringify(flagged)}`);
            await addFraud(flagged);
            
        }
        return true;
    } catch (error) {
        logger.error(`Error processing transaction: ${error.message}`);
        return false;
    }
}

run().catch(err => logger.error(`Error: ${err.message}`));
