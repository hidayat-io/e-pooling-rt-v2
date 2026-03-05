require('dotenv').config();
const { initDatabase, closeDb } = require('./src/config/database');
const { processPendingMessages } = require('./src/jobs/messageQueue');
const { runTokenCleanup } = require('./src/jobs/tokenCleanup');
const logger = require('./src/config/logger');

async function main() {
    const command = process.argv[2];
    if (!command) {
        console.error('Usage: node worker.js <wa-queue|token-cleanup>');
        process.exit(1);
    }

    initDatabase();

    if (command === 'wa-queue') {
        const result = await processPendingMessages();
        logger.info('WA queue worker result', result);
    } else if (command === 'token-cleanup') {
        const result = await runTokenCleanup();
        logger.info('Token cleanup worker result', result);
    } else {
        console.error(`Unknown command: ${command}`);
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        logger.error('Worker failed:', error);
        process.exitCode = 1;
    })
    .finally(() => {
        closeDb();
    });
