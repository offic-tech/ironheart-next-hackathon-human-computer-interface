import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const mockOrigin = "https://mock-s3.local";

type RecordingUploadInput = {
  contentType?: string;
  sessionId?: string;
  botId?: string;
};

function getAwsConfig() {
  return {
    region: process.env.AWS_REGION || "us-east-1",
    bucket: process.env.AWS_S3_BUCKET || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    mockMode: process.env.AWS_S3_MOCK_MODE !== "false",
  };
}

function isAwsConfigured() {
  const config = getAwsConfig();
  return Boolean(config.bucket && config.accessKeyId && config.secretAccessKey);
}

function createS3Client() {
  const config = getAwsConfig();

  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function safeSegment(value?: string) {
  return (value || "unknown")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensionFromContentType(contentType?: string) {
  if (!contentType) return "webm";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  return "webm";
}

export function shouldUseMockS3() {
  const config = getAwsConfig();
  return config.mockMode || !isAwsConfigured();
}

export function createRecordingKey(input: RecordingUploadInput) {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  const ext = extensionFromContentType(input.contentType);

  return [
    "recordings",
    "oya",
    `${yyyy}-${mm}-${dd}`,
    safeSegment(input.sessionId),
    `${timestamp}-${safeSegment(input.botId)}.${ext}`,
  ].join("/");
}

export async function createUploadUrl(input: RecordingUploadInput) {
  const config = getAwsConfig();
  const contentType = input.contentType || "audio/webm";
  const key = createRecordingKey(input);

  if (shouldUseMockS3()) {
    return {
      mode: "mock" as const,
      key,
      method: "PUT",
      uploadUrl: `${mockOrigin}/put/${encodeURIComponent(key)}`,
      publicUrl: `${mockOrigin}/recordings/${encodeURIComponent(key)}`,
      expiresIn: 900,
      bucket: config.bucket || "mock-bucket",
      region: config.region,
    };
  }

  const client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    Metadata: {
      product: "oya",
      session_id: safeSegment(input.sessionId),
      bot_id: safeSegment(input.botId),
    },
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

  return {
    mode: "s3" as const,
    key,
    method: "PUT",
    uploadUrl,
    publicUrl: null,
    expiresIn: 900,
    bucket: config.bucket,
    region: config.region,
  };
}

export async function createReadUrl(key: string) {
  const config = getAwsConfig();

  if (shouldUseMockS3()) {
    return {
      mode: "mock" as const,
      key,
      readUrl: `${mockOrigin}/recordings/${encodeURIComponent(key)}`,
      expiresIn: 900,
      bucket: config.bucket || "mock-bucket",
      region: config.region,
    };
  }

  const client = createS3Client();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const readUrl = await getSignedUrl(client, command, { expiresIn: 900 });

  return {
    mode: "s3" as const,
    key,
    readUrl,
    expiresIn: 900,
    bucket: config.bucket,
    region: config.region,
  };
}
