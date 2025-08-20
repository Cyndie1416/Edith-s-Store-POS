# 📱 SMS Setup Guide - Real SMS Messages

## Why SMS Shows "Success" But No Message Received

The SMS system is currently running in **simulation mode** - it logs messages to the console but doesn't actually send them. This is why you see "SMS sent successfully!" but customers don't receive messages.

## 🚀 Quick Setup for Real SMS (Twilio)

### Step 1: Get Twilio Account
1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Get your credentials from the Twilio Console

### Step 2: Create Environment File
Create a file called `.env` in the `server` folder with:

```env
# SMS Configuration
DEFAULT_SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=your_twilio_phone_number
TWILIO_ENABLED=true
SMS_NOTIFICATIONS_ENABLED=true
STORE_NAME=Edith's Store
```

### Step 3: Get Your Twilio Credentials
1. **Account SID**: Found in your Twilio Console dashboard
2. **Auth Token**: Found in your Twilio Console dashboard  
3. **Phone Number**: Buy a phone number in Twilio Console (about $1/month)

### Step 4: Test SMS
1. Restart your server after adding the `.env` file
2. Try sending an SMS to a customer
3. Check the server console for real SMS logs

## 💰 Cost Information
- **Twilio**: ~$0.0075 per SMS (US numbers)
- **Free Trial**: $15-20 credit for testing
- **Phone Number**: ~$1/month

## 🔧 Alternative SMS Services

### Option 2: Nexmo/Vonage
```env
DEFAULT_SMS_SERVICE=nexmo
NEXMO_API_KEY=your_api_key
NEXMO_API_SECRET=your_api_secret
NEXMO_FROM_NUMBER=your_phone_number
NEXMO_ENABLED=true
```

### Option 3: AWS SNS
```env
DEFAULT_SMS_SERVICE=aws
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_FROM_NUMBER=your_phone_number
AWS_SMS_ENABLED=true
```

## 🧪 Testing
1. Use your own phone number for testing
2. Check server logs for SMS delivery status
3. Verify messages arrive on your phone

## ❗ Important Notes
- **Phone Number Format**: Use international format (+639123456789)
- **Message Length**: Keep under 160 characters
- **Rate Limits**: Don't send too many messages quickly
- **Testing**: Always test with your own number first

## 🆘 Troubleshooting
- **"Invalid phone number"**: Use international format
- **"Authentication failed"**: Check your Twilio credentials
- **"Message not delivered"**: Check if number is valid and active
