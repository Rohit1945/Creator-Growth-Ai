import { db } from "./db";
import { viewers, type Viewer } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getViewerCount(): Promise<number>;
  recordViewer(ipHash: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getViewerCount(): Promise<number> {
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(viewers);
    return Number(count.count);
  }

  async recordViewer(ipHash: string): Promise<void> {
    await db.insert(viewers).values({ ipHash }).onConflictDoNothing();
  }
}

export const storage = new DatabaseStorage();
