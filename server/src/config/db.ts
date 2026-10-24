import mongoose from 'mongoose';
import { env } from './env';

let isConnecting = false;
let retryCount = 0;
const MAX_STARTUP_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface DatabaseDiagnostics {
  status: 'connected' | 'connecting' | 'disconnected' | 'disconnecting';
  readyState: number;
  pingLatencyMs: number | null;
  isAtlas: boolean;
  poolSize?: number;
  activeConnections?: number;
}

export function maskMongoUri(uri: string): string {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/, '$1*****@');
}

export async function connectDatabase(uri?: string): Promise<boolean> {
  const mongoUri = uri || env.MONGODB_URI;

  if (!mongoUri) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: MONGODB_URI environment variable is required in production mode. Server cannot start.'
      );
    }
    console.warn(
      '⚠️  MONGODB_URI is not set. Database operations will return a safe unavailable error.'
    );
    return false;
  }

  const maskedUri = maskMongoUri(mongoUri);
  const isAtlas = mongoUri.startsWith('mongodb+srv://');

  try {
    isConnecting = true;
    mongoose.set('strictQuery', true);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 50,
      minPoolSize: 5,
    });

    isConnecting = false;
    retryCount = 0;
    console.log(`📦 Connected to MongoDB (${isAtlas ? 'Atlas cluster' : 'Standard instance'}) at ${maskedUri}`);

    // Register resilience listeners
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB connection lost. Awaiting automatic reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB connection restored.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB runtime error: ${err.message}`);
    });

    return true;
  } catch (error) {
    isConnecting = false;
    const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
    console.error(`❌ Failed to connect to MongoDB: ${errorMsg}`);

    // Production fail-fast check
    if (env.NODE_ENV === 'production') {
      if (retryCount < MAX_STARTUP_RETRIES) {
        retryCount++;
        console.warn(`🔄 Retrying database connection (${retryCount}/${MAX_STARTUP_RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return connectDatabase(uri);
      }
      throw new Error(`CRITICAL: Production MongoDB connection could not be established: ${errorMsg}`);
    }

    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function getDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
  const readyState = mongoose.connection.readyState;
  const statusMap: Record<number, DatabaseDiagnostics['status']> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const status = statusMap[readyState] || 'disconnected';
  const mongoUri = env.MONGODB_URI || '';
  const isAtlas = mongoUri.startsWith('mongodb+srv://');

  let pingLatencyMs: number | null = null;

  if (readyState === 1 && mongoose.connection.db) {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      pingLatencyMs = Date.now() - startTime;
    } catch {
      pingLatencyMs = null;
    }
  }

  return {
    status,
    readyState,
    pingLatencyMs,
    isAtlas,
  };
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}
