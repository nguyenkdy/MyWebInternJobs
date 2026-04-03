const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

const S3_PUBLIC = String(process.env.S3_PUBLIC || "false").toLowerCase() === "true";
const S3_SIGNED_EXPIRES_SECONDS = Number(process.env.S3_SIGNED_EXPIRES_SECONDS || "3600");

function getS3Client() {
  // Uses standard AWS env vars (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) automatically.
  // If you run on AWS compute, you can omit explicit credentials and use IAM roles.
  return new S3Client({ region: requiredEnv("AWS_REGION") });
}

function publicObjectUrl(key) {
  // Works for standard public buckets.
  // For some regions/partitions this can be different; you can override by setting S3_PUBLIC_URL_BASE.
  const base =
    process.env.S3_PUBLIC_URL_BASE ||
    `https://${requiredEnv("S3_BUCKET_NAME")}.s3.${requiredEnv("AWS_REGION")}.amazonaws.com`;
  return `${base}/${key}`;
}

function safeFileName(name) {
  return String(name || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

function buildS3Key({ userId, kind, originalName }) {
  const ts = Date.now();
  return `users/${userId}/${kind}/${ts}-${safeFileName(originalName)}`;
}

async function uploadImageToS3({ buffer, key, contentType }) {
  const s3 = getS3Client();
  const Bucket = requiredEnv("S3_BUCKET_NAME");
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: S3_PUBLIC ? publicObjectUrl(key) : null,
  };
}

async function getImageUrlFromS3(key) {
  if (!key) return null;
  if (S3_PUBLIC) return publicObjectUrl(key);

  const s3 = getS3Client();
  const Bucket = requiredEnv("S3_BUCKET_NAME");
  const cmd = new GetObjectCommand({ Bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: S3_SIGNED_EXPIRES_SECONDS });
}

async function deleteFromS3(key) {
  if (!key) return;
  const s3 = getS3Client();
  const Bucket = requiredEnv("S3_BUCKET_NAME");
  await s3.send(
    new DeleteObjectCommand({
      Bucket,
      Key: key,
    })
  );
}

module.exports = {
  uploadImageToS3,
  getImageUrlFromS3,
  deleteFromS3,
  buildS3Key,
};

