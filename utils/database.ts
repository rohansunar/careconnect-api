/**
 * PrismaClient instance for PostgreSQL database connection.
 * Configured to connect via DATABASE_URL environment variable using PrismaPg adapter.
 * This utility provides a singleton PrismaClient for database operations.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;