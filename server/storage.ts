import { type User, type InsertUser, type ContentDraft, type InsertContentDraft } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Content draft methods
  getContentDraft(id: string): Promise<ContentDraft | undefined>;
  getContentDraftsByUserId(userId: string): Promise<ContentDraft[]>;
  createContentDraft(draft: InsertContentDraft): Promise<ContentDraft>;
  updateContentDraft(id: string, updates: Partial<ContentDraft>): Promise<ContentDraft | undefined>;
  deleteContentDraft(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contentDrafts: Map<string, ContentDraft>;

  constructor() {
    this.users = new Map();
    this.contentDrafts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      id,
      farcasterFid: insertUser.farcasterFid || null,
      farcasterUsername: insertUser.farcasterUsername || null,
      farcasterDisplayName: insertUser.farcasterDisplayName || null,
      farcasterAvatar: insertUser.farcasterAvatar || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getContentDraft(id: string): Promise<ContentDraft | undefined> {
    return this.contentDrafts.get(id);
  }

  async getContentDraftsByUserId(userId: string): Promise<ContentDraft[]> {
    return Array.from(this.contentDrafts.values()).filter(
      (draft) => draft.userId === userId,
    );
  }

  async createContentDraft(insertDraft: InsertContentDraft): Promise<ContentDraft> {
    const id = randomUUID();
    const draft: ContentDraft = {
      id,
      userId: insertDraft.userId,
      topic: insertDraft.topic,
      contentType: insertDraft.contentType,
      tone: insertDraft.tone,
      generatedContent: insertDraft.generatedContent || null,
      selectedImage: insertDraft.selectedImage || null,
      isPublished: insertDraft.isPublished || false,
      farcasterCastHash: insertDraft.farcasterCastHash || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contentDrafts.set(id, draft);
    return draft;
  }

  async updateContentDraft(id: string, updates: Partial<ContentDraft>): Promise<ContentDraft | undefined> {
    const draft = this.contentDrafts.get(id);
    if (!draft) return undefined;
    
    const updatedDraft = { 
      ...draft, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.contentDrafts.set(id, updatedDraft);
    return updatedDraft;
  }

  async deleteContentDraft(id: string): Promise<boolean> {
    return this.contentDrafts.delete(id);
  }
}

export const storage = new MemStorage();
