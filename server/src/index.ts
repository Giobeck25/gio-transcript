import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { notesRouter } from './routes/notes.js';
import { meetingsRouter } from './routes/meetings.js';
import { calendarRouter } from './routes/calendar.js';
import { proposalsRouter } from './routes/proposals.js';
import { tasksRouter } from './routes/tasks.js';
import { canvasRouter } from './routes/canvas.js';
import { geofenceRouter } from './routes/geofence.js';
import { companionRouter } from './routes/companion.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'OmniFlow AI Enterprise Core',
    azureOpenAiConfigured: !!config.azure.openai.apiKey,
    cosmosDbConfigured: !!config.azure.cosmos.endpoint,
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/canvas', canvasRouter);
app.use('/api/geofences', geofenceRouter);
app.use('/api/companion', companionRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 OmniFlow AI Enterprise Platform running on http://localhost:${config.port}`);
  console.log(`   Tenant isolation active. Azure AI & Cosmos DB connected.`);
  console.log(`=======================================================`);
});
