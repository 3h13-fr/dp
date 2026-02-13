#!/usr/bin/env node
/**
 * Test script for S3 configuration
 * Verifies AWS credentials, bucket access, and presigned URL generation
 * Run with: pnpm test:s3 (from root) or node scripts/test-s3.mjs (from apps/api)
 */

import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '..', '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          env[key.trim()] = value;
        }
      }
    });
    return env;
  } catch (err) {
    console.error('❌ Error loading .env file:', err.message);
    process.exit(1);
  }
}

const env = loadEnv();

const ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
const BUCKET = env.AWS_S3_BUCKET;
const REGION = env.AWS_REGION || 'eu-west-1';
const ENDPOINT = env.AWS_S3_ENDPOINT;
const PUBLIC_URL = env.AWS_S3_PUBLIC_URL;

const out = (msg) => console.log(msg);
const err = (msg) => console.error(msg);

async function testS3() {
  out('\n🔍 Testing S3 Configuration...\n');

  // 1. Check environment variables
  out('📋 Step 1: Checking environment variables');
  if (!ACCESS_KEY_ID) {
    err('❌ AWS_ACCESS_KEY_ID is missing');
    process.exit(1);
  }
  if (!SECRET_ACCESS_KEY) {
    err('❌ AWS_SECRET_ACCESS_KEY is missing');
    process.exit(1);
  }
  if (!BUCKET) {
    err('❌ AWS_S3_BUCKET is missing');
    process.exit(1);
  }
  out(`✓ AWS_ACCESS_KEY_ID: ${ACCESS_KEY_ID.substring(0, 8)}...`);
  out(`✓ AWS_SECRET_ACCESS_KEY: ${SECRET_ACCESS_KEY.substring(0, 8)}...`);
  out(`✓ AWS_S3_BUCKET: ${BUCKET}`);
  out(`✓ AWS_REGION: ${REGION}`);
  if (ENDPOINT) out(`✓ AWS_S3_ENDPOINT: ${ENDPOINT}`);
  if (PUBLIC_URL) out(`✓ AWS_S3_PUBLIC_URL: ${PUBLIC_URL}`);

  // 2. Create S3 client
  out('\n📦 Step 2: Creating S3 client');
  const s3Config = {
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  };
  if (ENDPOINT) {
    s3Config.endpoint = ENDPOINT;
    s3Config.forcePathStyle = true;
  }
  const s3 = new S3Client(s3Config);
  out('✓ S3 client created');

  // 3. Test credentials by listing buckets (optional - may fail if user only has bucket-specific permissions)
  out('\n🔐 Step 3: Testing AWS credentials');
  try {
    const listBucketsCmd = new ListBucketsCommand({});
    const bucketsResponse = await s3.send(listBucketsCmd);
    out(`✓ Credentials valid (found ${bucketsResponse.Buckets?.length || 0} buckets)`);
    if (bucketsResponse.Buckets) {
      const bucketNames = bucketsResponse.Buckets.map((b) => b.Name).join(', ');
      out(`  Buckets: ${bucketNames || 'none'}`);
    }
  } catch (error) {
    if (error.message?.includes('ListAllMyBuckets')) {
      out(`⚠️  Cannot list all buckets (user has bucket-specific permissions only - this is OK)`);
      out(`  Continuing with bucket-specific tests...`);
    } else {
      err(`❌ Credentials test failed: ${error.message}`);
      process.exit(1);
    }
  }

  // 4. Test bucket access
  out('\n🪣 Step 4: Testing bucket access');
  try {
    const headBucketCmd = new HeadBucketCommand({ Bucket: BUCKET });
    await s3.send(headBucketCmd);
    out(`✓ Bucket "${BUCKET}" exists and is accessible`);
  } catch (error) {
    const statusCode = error.$metadata?.httpStatusCode;
    if (statusCode === 404 || error.name === 'NotFound') {
      err(`❌ Bucket "${BUCKET}" not found in region "${REGION}"`);
      err(`   Possible causes:`);
      err(`   - Bucket doesn't exist`);
      err(`   - Bucket exists in a different region`);
      err(`   - Check AWS Console: https://s3.console.aws.amazon.com/s3/buckets`);
    } else if (statusCode === 403 || error.name === 'Forbidden') {
      err(`❌ Access denied to bucket "${BUCKET}"`);
      err(`   Check IAM permissions for user`);
    } else {
      err(`❌ Error accessing bucket: ${error.message}`);
      if (error.$metadata) {
        err(`   Status: ${statusCode || 'unknown'}`);
        err(`   Request ID: ${error.$metadata.requestId || 'unknown'}`);
      }
    }
    process.exit(1);
  }

  // 5. List objects in bucket (optional, to verify read permissions)
  out('\n📂 Step 5: Testing list objects permission');
  try {
    const listObjectsCmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 5,
    });
    const listResponse = await s3.send(listObjectsCmd);
    const count = listResponse.KeyCount || 0;
    out(`✓ List permission OK (found ${count} object(s))`);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      out('  Sample objects:');
      listResponse.Contents.slice(0, 3).forEach((obj) => {
        out(`    - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
  } catch (error) {
    err(`⚠️  List permission test failed: ${error.message}`);
    err('  (This is OK if you only have PutObject permission)');
  }

  // 6. Test presigned URL generation
  out('\n🔗 Step 6: Testing presigned URL generation');
  try {
    const testKey = `test/${Date.now()}-test-file.txt`;
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: testKey,
      ContentType: 'text/plain',
    });
    const presignedUrl = await getSignedUrl(s3, putCommand, { expiresIn: 3600 });
    out(`✓ Presigned URL generated successfully`);
    out(`  Key: ${testKey}`);
    out(`  URL: ${presignedUrl.substring(0, 80)}...`);
    out(`  Expires in: 3600 seconds (1 hour)`);
  } catch (error) {
    err(`❌ Presigned URL generation failed: ${error.message}`);
    process.exit(1);
  }

  // 7. Test public URL format
  out('\n🌐 Step 7: Testing public URL format');
  const testPublicKey = 'test/sample-file.jpg';
  const expectedPublicUrl = PUBLIC_URL
    ? `${PUBLIC_URL}/${testPublicKey}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${testPublicKey}`;
  out(`✓ Public URL format: ${expectedPublicUrl}`);

  // Summary
  out('\n✅ Summary');
  out('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  out('✓ All S3 tests passed!');
  out(`✓ Bucket: ${BUCKET}`);
  out(`✓ Region: ${REGION}`);
  out('✓ Your S3 configuration is ready to use.');
  out('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testS3().catch((error) => {
  err('\n❌ Test failed with error:');
  err(error);
  process.exit(1);
});
