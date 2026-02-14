import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "EVALLY";
const SMS_TYPE = process.env.SMS_TYPE || "Transactional";

const sns = new SNSClient({
  region: AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

export async function sendOtpSms(phone: string, otp: string) {
  const message = `Your ExploreValley OTP is ${otp}. It expires in 5 minutes. Do not share it with anyone.`;
  const cmd = new PublishCommand({
    Message: message,
    PhoneNumber: phone,
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": { DataType: "String", StringValue: SMS_SENDER_ID },
      "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: SMS_TYPE },
    },
  });
  await sns.send(cmd);
}
