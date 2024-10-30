import dotenv from 'dotenv';
dotenv.config();

export const config = {
  vonage: {
    apiKey: process.env.VONAGE_API_KEY!,
    apiSecret: process.env.VONAGE_API_SECRET!,
    applicationId: process.env.VONAGE_APPLICATION_ID!,
    privateKey: process.env.VONAGE_PRIVATE_KEY!,
  },
  dify: {
    apiKey: process.env.DIFY_API_KEY!,
    apiEndpoint: process.env.DIFY_API_ENDPOINT!,
  },
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    credentials: {
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL!,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY!,
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  postgres: {
    url: process.env.DATABASE_URL!,
  },
};