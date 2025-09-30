import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Setup in-memory MongoDB server for testing
 *
 * Benefits:
 * - Fast: No external database needed
 * - Isolated: Each test file gets its own database instance
 * - Parallel: Tests can run in parallel without conflicts
 * - Clean: Automatically cleans up after tests
 */
beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

// Clean up after all tests
afterAll(async () => {
  // Close mongoose connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  // Stop the in-memory MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
});
