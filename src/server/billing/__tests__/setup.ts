import mongoose from 'mongoose';

// Setup test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://root:test1234@localhost:27017/fitfam_test?authSource=admin';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

// Clean up after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
