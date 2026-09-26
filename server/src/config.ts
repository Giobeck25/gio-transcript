import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or server root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'omniflow-super-secret-jwt-key-2026',
  azure: {
    openai: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_KEY || '',
      chatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o',
      visionDeployment: process.env.AZURE_OPENAI_VISION_DEPLOYMENT || 'gpt-4o',
      whisperDeployment: process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || 'whisper',
      apiVersion: '2024-08-01-preview',
    },
    cosmos: {
      endpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
      key: process.env.AZURE_COSMOS_KEY || '',
      databaseId: process.env.AZURE_COSMOS_DATABASE || 'note-app-db',
    },
  },
};
