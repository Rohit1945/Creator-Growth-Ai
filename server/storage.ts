import { db } from "./db";

export interface IStorage {
  // We don't need any storage methods for this stateless app yet
  // but keeping the interface for future extensibility
}

export class DatabaseStorage implements IStorage {
  // Empty implementation
}

export const storage = new DatabaseStorage();
