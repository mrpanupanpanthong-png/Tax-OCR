// To run this script: `npx ts-node src/scripts/cleanup-service.ts`
// Or compile and run via a cron job on your server

import { Storage } from '@google-cloud/storage';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id';
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'tax-invoices-storage';
const DAYS_TO_KEEP = 30;

// Initialize Google Cloud Storage client
// Assumes GOOGLE_APPLICATION_CREDENTIALS env var is set
const storage = new Storage({ projectId: PROJECT_ID });

/**
 * Cleanup Service: Deletes files older than a specified number of days
 * from a Google Cloud Storage bucket.
 */
async function cleanupOldFiles() {
  console.log(`Starting cleanup service for bucket: ${BUCKET_NAME}...`);
  const bucket = storage.bucket(BUCKET_NAME);
  
  try {
    // 1. Get all files in the bucket
    const [files] = await bucket.getFiles();
    console.log(`Found ${files.length} total files in the bucket.`);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (DAYS_TO_KEEP * 24 * 60 * 60 * 1000));
    console.log(`Deleting files older than: ${cutoffDate.toISOString()}`);

    let deletedCount = 0;

    // 2. Iterate and check metadata
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const timeCreated = new Date(metadata.timeCreated);

      // 3. Delete if older than 30 days
      if (timeCreated < cutoffDate) {
        console.log(`Deleting old file: ${file.name} (Created: ${timeCreated.toISOString()})`);
        await file.delete();
        deletedCount++;
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} files.`);
  } catch (error) {
    console.error('Error during cleanup operation:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  cleanupOldFiles().then(() => process.exit(0));
}
