export async function saveToS3(file: File, ticketId: string, uniqueName: string): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  
  if (!bucketName || !region) {
    throw new Error("S3 configuration is missing");
  }

  const key = `${ticketId}/${uniqueName}`;

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}
