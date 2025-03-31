import mongoose from 'mongoose';

const MONGODB_URI = process.env.DB_URL || 'mongodb://localhost:27017/voice-analytics';

if (!MONGODB_URI) {
  throw new Error('Please define the DB_URL environment variable inside .env');
}

class MongoDB {
  private static instance: MongoDB;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        await mongoose.connect(MONGODB_URI);
        this.isConnected = true;
        console.log('Connected to MongoDB');
        resolve();
      } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.connectionPromise = null;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public isConnectedToDB(): boolean {
    return this.isConnected;
  }
}

export const db = MongoDB.getInstance();
export const connectDB = () => db.connect();
export const disconnectDB = () => db.disconnect(); 