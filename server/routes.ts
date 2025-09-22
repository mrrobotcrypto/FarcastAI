import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/openai";
import { pexelsService } from "./services/pexels";
import { farcasterService } from "./services/farcaster";
import { insertUserSchema, insertContentDraftSchema } from "@shared/schema";
import { z } from "zod";

const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  contentType: z.string().min(1, "Content type is required"),
  tone: z.string().min(1, "Tone is required"),
});

const publishCastSchema = z.object({
  draftId: z.string().min(1, "Draft ID is required"),
  imageUrl: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByWalletAddress(userData.walletAddress);
      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWalletAddress(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Content generation routes
  app.post("/api/content/generate", async (req, res) => {
    try {
      const { topic, contentType, tone } = generateContentSchema.parse(req.body);
      
      const generatedContent = await aiService.generateContent(topic, contentType, tone);
      res.json({ content: generatedContent });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Content draft routes
  app.post("/api/drafts", async (req, res) => {
    try {
      const draftData = insertContentDraftSchema.parse(req.body);
      const draft = await storage.createContentDraft(draftData);
      res.json(draft);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/drafts/user/:userId", async (req, res) => {
    try {
      const drafts = await storage.getContentDraftsByUserId(req.params.userId);
      res.json(drafts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/drafts/:id", async (req, res) => {
    try {
      const updates = req.body;
      const draft = await storage.updateContentDraft(req.params.id, updates);
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
      res.json(draft);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/drafts/:id", async (req, res) => {
    try {
      const success = await storage.deleteContentDraft(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Draft not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Image search routes
  app.get("/api/images/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const perPage = parseInt(req.query.per_page as string) || 12;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const photos = await pexelsService.searchPhotos(query, perPage);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/images/featured", async (req, res) => {
    try {
      const perPage = parseInt(req.query.per_page as string) || 12;
      const photos = await pexelsService.getFeaturedPhotos(perPage);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Farcaster casting routes
  app.post("/api/farcaster/cast", async (req, res) => {
    try {
      const { draftId, imageUrl } = publishCastSchema.parse(req.body);
      
      const draft = await storage.getContentDraft(draftId);
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      const user = await storage.getUser(draft.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // If user doesn't have Farcaster FID, use demo mode
      let farcasterFid = user.farcasterFid;
      if (!farcasterFid) {
        // Demo mode: Use a placeholder FID for testing
        farcasterFid = "123456";
        console.log("Demo mode: Using placeholder FID for casting");
      }

      // Prepare cast for manual submission instead of auto-posting
      const castPreparation = await farcasterService.prepareCast(
        farcasterFid,
        draft.generatedContent || "",
        imageUrl
      );

      // Mark as prepared but not yet published
      await storage.updateContentDraft(draftId, {
        isPublished: false, // Will be true when user manually posts
        farcasterCastHash: null, // Will be set when user provides it
      });

      res.json({
        ...castPreparation,
        message: "Cast prepared for manual posting to Farcaster"
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/farcaster/profile/:fid", async (req, res) => {
    try {
      const profile = await farcasterService.getUserProfile(req.params.fid);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/farcaster/user-by-wallet/:walletAddress", async (req, res) => {
    try {
      const farcasterUser = await farcasterService.getUserByWalletAddress(req.params.walletAddress);
      if (!farcasterUser) {
        return res.status(404).json({ message: "User not found on Farcaster" });
      }
      res.json(farcasterUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook for Farcaster events
  app.post("/api/webhook", async (req, res) => {
    try {
      // Handle Farcaster server events (notifications, etc.)
      console.log("Farcaster webhook received:", req.body);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
