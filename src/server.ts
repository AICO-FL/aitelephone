import express from 'express';
import cors from 'cors';
import vonageWebhook from './webhooks/vonageWebhook';
import { Logger } from './services/logger';
import { config } from './config';

const app = express();
const logger = new Logger();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Vonage webhooks
app.use('/webhooks/vonage', vonageWebhook);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});