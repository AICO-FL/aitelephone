import express from 'express';
import { CallController } from '../controllers/callController';
import { Logger } from '../services/logger';

const router = express.Router();
const logger = new Logger();
const callController = new CallController();

router.post('/answer', (req, res) => {
  logger.info('Incoming call received', { body: req.body });

  // Return NCCO (Nexmo Call Control Object) for incoming calls
  const ncco = [
    {
      action: 'talk',
      text: 'お電話ありがとうございます。AIアシスタントにおつなぎします。',
      language: 'ja-JP',
      style: 2
    },
    {
      action: 'connect',
      eventType: 'synchronous',
      from: process.env.VONAGE_NUMBER,
      endpoint: [
        {
          type: 'websocket',
          uri: `${process.env.BASE_URL}/socket`,
          'content-type': 'audio/l16;rate=16000',
          headers: {
            'caller-id': req.body.from,
            language: 'ja-JP'
          }
        }
      ]
    }
  ];

  res.json(ncco);
});

router.post('/events', (req, res) => {
  const event = req.body;
  logger.info('Call event received', { event });

  switch (event.status) {
    case 'answered':
      callController.handleIncomingCall(event.uuid);
      break;
    case 'completed':
    case 'failed':
    case 'rejected':
    case 'busy':
    case 'cancelled':
      callController.handleCallDisconnection(event.uuid);
      break;
  }

  res.sendStatus(200);
});

export default router;