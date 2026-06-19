import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default defineConfig({
    datasource: {
        // Use direct connection for CLI/migrations
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
});
