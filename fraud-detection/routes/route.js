import express from 'express';
import { getFraudByUserId, getFrauds } from '../services/fraudsService.js';
import { admin, producer } from '../kafka/kafkaClient.js';

const router = express.Router();

router.get('/frauds', (req, res) => {
    getFrauds()
        .then(frauds => res.json(frauds))
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
});

router.get('/frauds/:userId', (req, res) => {
    const { userId } = req.params;
    getFraudByUserId(userId)
        .then(fraud => {
            if (fraud) {
                res.json(fraud);
            } else {
                res.status(404).send('Fraud not found');
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
});

router.get('/health', async (req, res) => {
    const health = {
    status: 'UP',
    components: {
      kafka: {
        status: 'UP',
      },
    },
  };

  try {
    await admin.connect();
    const topics = await admin.listTopics();

    const requiredTopic = 'transactions';
    if (!topics.includes(requiredTopic)) {
      throw new Error(`Required topic "${requiredTopic}" not found`);
    }

    await admin.disconnect();
  } catch (err) {
    health.status = 'DOWN';
    health.components.kafka.status = 'DOWN';
    health.components.kafka.error = err.message;
    return res.status(503).json(health);
  }

  res.json(health);
})

router.post('/newtxn', (req, res) => {

    if (!req.body || !req.body.userId || !req.body.transactionId || !req.body.amount || !req.body.location || !req.body.timestamp ) {
        return res.status(400).send('Invalid transaction data');
    }
    producer.send({
        topic: 'transactions',
        messages: [{ value: JSON.stringify(req.body)}]
    })
    .then(() => {
        res.status(200).send('Transaction sent for processing');
    }).catch(err => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });
})

export { router };