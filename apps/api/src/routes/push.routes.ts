import { Router, Request, Response } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { pushService } from "../services/push/push.service";
import { logger } from "../config/logger";

const router = Router();

// Get VAPID public key
router.get("/vapid-key", (req: Request, res: Response) => {
  const publicKey = pushService.getPublicKey();

  if (!publicKey) {
    return res.status(503).json({
      error: "Push notifications not configured",
    });
  }

  res.json({ publicKey });
});

// Subscribe to push notifications
router.post("/subscribe", authenticate, async (req: Request, res: Response) => {
  try {
    const { subscription } = req.body;
    const userId = (req as any).user.userId;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        error: "Invalid subscription object",
      });
    }

    await pushService.saveSubscription(userId, subscription);

    res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error) {
    logger.error("Error subscribing to push:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    await pushService.removeSubscription(userId);

    res.json({ success: true, message: "Unsubscribed from push notifications" });
  } catch (error) {
    logger.error("Error unsubscribing from push:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Test push notification (admin only)
router.post("/test", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const success = await pushService.sendToUser(userId, {
      title: "🧪 Teste de Notificação",
      body: "Se você está vendo isso, as notificações push estão funcionando!",
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
      },
    });

    if (success) {
      res.json({ success: true, message: "Test notification sent" });
    } else {
      res.status(400).json({
        error: "Failed to send notification. Check your subscription.",
      });
    }
  } catch (error) {
    logger.error("Error sending test push:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

export { router as pushRouter };
