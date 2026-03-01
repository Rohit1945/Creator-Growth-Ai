import { db } from "./db";
import { viewers, videoAnalyses, type Viewer, type VideoAnalysis, type InsertAnalysis } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface IStorage {
  getViewerCount(): Promise<number>;
  recordViewer(ipHash: string): Promise<void>;
  saveAnalysis(analysis: InsertAnalysis): Promise<VideoAnalysis>;
  getAnalysisHistory(): Promise<VideoAnalysis[]>;
}

export class DatabaseStorage implements IStorage {
  async getViewerCount(): Promise<number> {
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(viewers);
    return Number(count.count);
  }

  async recordViewer(ipHash: string): Promise<void> {
    await db.insert(viewers).values({ ipHash }).onConflictDoNothing();
  }

  async saveAnalysis(analysis: InsertAnalysis): Promise<VideoAnalysis> {
    const [result] = await db.insert(videoAnalyses).values(analysis).returning();
    return result;
  }

  async getAnalysisHistory(): Promise<VideoAnalysis[]> {
    return await db.select().from(videoAnalyses).orderBy(desc(videoAnalyses.id));
  }
}

export const storage = new DatabaseStorage();
