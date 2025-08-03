import express from 'express';
import { requestLatency, metricsEndpoint } from './utils/metrics.js';
import 'dotenv/config'
import { router } from './routes/route.js';
import './kafka/fraud-detector.js'
import { db } from './services/db.js';
import { connectKafka, disconnectKafka } from './kafka/kafkaClient.js';

const app = express();

const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const end = requestLatency.startTimer();
    res.on('finish', () => {
        end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
    });
    next();
});


app.use('/', router);
// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => await metricsEndpoint(req, res));

app.use((err, req, res, next) => {
    db.close((err) => {
        if (err) {
            console.log('Error closing the database:', err);
        } else {
            console.log('Database closed');
        }
    });
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


async function startApp() {
  await connectKafka();
  console.log('Kafka client connected.');

  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Setup graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await disconnectKafka();

    db.close((err) => {
        if (err) {
            console.log('Error closing the database:', err);
        } else {
            console.log('Database closed');
        }
    });

    process.exit(0);
};

startApp().catch(error => {
    console.error('Failed to start application:', error);
    shutdown();
});
process.on('uncaughtException', err => {
    console.error('Uncaught Exception:', err);
    shutdown();
});

process.on('unhandledRejection', err => {
    console.error('Unhandled Rejection:', err);
    shutdown();
});

// start Express Server
app.listen(PORT, () => {
    console.log('Server is running on port', PORT)
})