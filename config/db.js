const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration
 * Connects to process.env.MONGO_URI (Atlas or local).
 * In development mode, if local MongoDB is not running, falls back automatically
 * to an in-memory MongoDB instance so all features work out-of-the-box.
 */
const connectDB = async () => {
  const options = {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 3000, // Quick timeout (3s) to fallback fast if local DB isn't running
    socketTimeoutMS: 45000,
    family: 4
  };

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance_tracker';

  try {
    const conn = await mongoose.connect(mongoURI, options);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host} [Database: ${conn.connection.name}]`);
    
    mongoose.connection.on('error', (err) => {
      console.error(`⚠️ MongoDB Runtime Error: ${err.message}`);
    });

  } catch (error) {
    console.warn(`⚠️ Primary MongoDB Connection Failed (${error.message}).`);

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: Production database connection failed. Exiting process...');
      process.exit(1);
    } else {
      try {
        console.log('⚡ Starting in-memory MongoDB database for development environment...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        
        await mongoose.connect(memUri, { family: 4 });
        console.log(`✅ In-Memory MongoDB Running & Connected: ${memUri}`);
      } catch (memErr) {
        console.error(`❌ Failed to start in-memory MongoDB: ${memErr.message}`);
      }
    }
  }
};

module.exports = connectDB;
