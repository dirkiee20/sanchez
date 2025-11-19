// Database configuration for deployment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rental_system',
  port: parseInt(process.env.DB_PORT) || 3306,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  // Connection pool settings for production
  connectionLimit: 10,
  queueLimit: 0,
  reconnect: true
};

module.exports = dbConfig;