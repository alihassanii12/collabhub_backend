const Redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const redisClient = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.connect();

module.exports = redisClient;