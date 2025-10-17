import { Router } from 'express';
import VisionController from '../controllers/visionController';
import upload from '../middleware/upload';

const router = Router();
const visionController = new VisionController();

// POST /api/vision/analyze - Analyze uploaded image
router.post('/analyze', upload.single('image'), visionController.analyzeImage);

// GET /api/vision/voice/status - Get voice service status
router.get('/voice/status', visionController.getVoiceStatus);

// POST /api/vision/voice/stop - Stop voice guidance
router.post('/voice/stop', visionController.stopVoice);

// POST /api/vision/voice/test - Test voice with custom message
router.post('/voice/test', visionController.testVoice);

export default router;
