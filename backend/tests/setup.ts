process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://enriq:enriq_dev_password@localhost:5433/enriq_test";
process.env.JWT_SECRET ??= "test-jwt-secret-key-at-least-32-characters-long";
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.CORS_ORIGINS ??= "http://localhost:5173";
