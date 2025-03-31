const dotenv = require('dotenv');
dotenv.config();

// Set default environment variables if not provided
process.env.PORT = process.env.PORT || 3000;
process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/library';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
