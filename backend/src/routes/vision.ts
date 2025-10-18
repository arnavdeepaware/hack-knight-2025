import { Router } from 'express';
import visionController from '../controllers/visionController';
import upload from '../middleware/upload';

const router = Router();

// POST /api/vision/analyze - Analyze uploaded image
router.post('/analyze', upload.single('image'), visionController.analyzeImage);

// POST /api/vision/ask - Answer a question about the uploaded image
router.post('/ask', upload.single('image'), visionController.answerQuestion);

// POST /api/vision/live - Analyze live video frame (throttled)
router.post('/live', upload.single('image'), visionController.analyzeLiveFrame);

// GET /api/vision/voice/status - Get voice service status
router.get('/voice/status', visionController.getVoiceStatus);

// POST /api/vision/voice/test - Test voice
router.post('/voice/test', visionController.testVoice);

// POST /api/vision/voice/stop - Stop voice
router.post('/voice/stop', visionController.stopVoice);
// POST /api/vision/packaged-food - Extract packaged food details as JSON
router.post('/packaged-food', upload.single('image'), visionController.analyzePackagedFood);

export default router;
