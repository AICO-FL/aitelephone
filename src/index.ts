import { CallController } from './controllers/callController';

async function main() {
  const callController = new CallController();

  // Example usage
  try {
    // Handle incoming call
    await callController.handleIncomingCall('+81XXXXXXXXXX');

    // The rest of the conversation flow is handled through WebSocket events
    // in the VonageService class
  } catch (error) {
    console.error('Error in main application:', error);
    process.exit(1);
  }
}

main();