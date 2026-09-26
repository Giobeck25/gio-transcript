import { Router, Request, Response } from 'express';
import { db, CanvasSchema } from '../db/index.js';
import { aiService } from '../services/ai.js';

export const canvasRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET all canvases
canvasRouter.get('/', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const canvases = db.getCanvases(tenantId);
  res.json({ success: true, canvases });
});

// GET single canvas
canvasRouter.get('/:id', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const canvas = db.getCanvas(tenantId, String(req.params.id));
  if (!canvas) {
    res.status(404).json({ success: false, error: 'Canvas not found' });
    return;
  }
  res.json({ success: true, canvas });
});

// POST save / update canvas
canvasRouter.post('/', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { id, title = 'Untitled Schema', elementsJson, snapshotBase64 } = req.body;

  const canvasId = id || `canvas-${Date.now()}`;
  const existing = db.getCanvas(tenantId, canvasId);

  const canvas: CanvasSchema = {
    id: canvasId,
    tenantId,
    userId,
    title,
    elementsJson: typeof elementsJson === 'string' ? elementsJson : JSON.stringify(elementsJson || {}),
    snapshotBase64,
    analysis: existing?.analysis,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveCanvas(canvas);
  res.json({ success: true, canvas });
});

// POST Analyze canvas with AI Vision
canvasRouter.post('/:id/analyze', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const canvas = db.getCanvas(tenantId, String(req.params.id));
  if (!canvas) {
    res.status(404).json({ success: false, error: 'Canvas not found' });
    return;
  }

  const { snapshotBase64 } = req.body;
  if (snapshotBase64) {
    canvas.snapshotBase64 = snapshotBase64;
  }

  try {
    const analysis = await aiService.analyzeCanvasVision(
      canvas.title,
      canvas.elementsJson,
      canvas.snapshotBase64
    );

    canvas.analysis = analysis;
    canvas.updatedAt = new Date().toISOString();
    db.saveCanvas(canvas);

    // Optionally create actionable tasks from diagram items
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      for (const item of analysis.actionItems.slice(0, 3)) {
        db.saveTask({
          id: `task-from-schema-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          userId,
          title: item,
          description: `Action item synthesized from schema diagram "${canvas.title}"`,
          priority: 'high',
          status: 'todo',
          subtasks: [],
          tags: ['Architecture', 'Diagram Action'],
          createdAt: new Date().toISOString(),
        });
      }
    }

    db.logAudit(tenantId, userId, 'CANVAS_VISION_ANALYSIS', { canvasId: canvas.id });
    res.json({ success: true, canvas, analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
