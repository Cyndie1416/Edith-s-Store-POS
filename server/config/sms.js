// SMS Service Configuration
// Replace these with your actual SMS service credentials

const smsConfig = {
  // Twilio Configuration (example)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'your_twilio_account_sid',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token',
    fromNumber: process.env.TWILIO_FROM_NUMBER || 'your_twilio_phone_number',
    enabled: process.env.TWILIO_ENABLED === 'true' || false
  },
  
  // Nexmo/Vonage Configuration (example)
  nexmo: {
    apiKey: process.env.NEXMO_API_KEY || 'your_nexmo_api_key',
    apiSecret: process.env.NEXMO_API_SECRET || 'your_nexmo_api_secret',
    fromNumber: process.env.NEXMO_FROM_NUMBER || 'your_nexmo_phone_number',
    enabled: process.env.NEXMO_ENABLED === 'true' || false
  },
  
  // AWS SNS Configuration (example)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your_aws_access_key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your_aws_secret_key',
    region: process.env.AWS_REGION || 'us-east-1',
    fromNumber: process.env.AWS_FROM_NUMBER || 'your_aws_phone_number',
    enabled: process.env.AWS_SMS_ENABLED === 'true' || false
  },
  
  // Default SMS service to use
  defaultService: process.env.DEFAULT_SMS_SERVICE || 'twilio',
  
  // SMS settings
  settings: {
    maxMessageLength: 160, // Standard SMS length
    enableNotifications: process.env.SMS_NOTIFICATIONS_ENABLED === 'true' || true,
    storeName: process.env.STORE_NAME || 'Edith\'s Store'
  }
};

module.exports = smsConfig;
