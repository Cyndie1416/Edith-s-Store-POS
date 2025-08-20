# SMS Setup Guide

This guide explains how to set up SMS notifications for customer credit balances in Edith's Store POS.

## Features

- Send SMS notifications to customers about their credit balance
- Include recent transaction history in the message
- Support for multiple SMS service providers
- Customizable message templates

## SMS Service Options

### 1. Twilio (Recommended)
- Most popular and reliable SMS service
- Good documentation and support
- Reasonable pricing

**Setup:**
1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Install the Twilio package: `npm install twilio`

### 2. Nexmo/Vonage
- Alternative to Twilio
- Good international coverage
- Competitive pricing

**Setup:**
1. Sign up at [vonage.com](https://www.vonage.com)
2. Get your API Key and API Secret
3. Purchase a phone number
4. Install the Nexmo package: `npm install nexmo`

### 3. AWS SNS
- Good if you're already using AWS
- Pay-per-use pricing
- Global coverage

**Setup:**
1. Create an AWS account
2. Set up IAM credentials
3. Install the AWS SDK: `npm install aws-sdk`

## Environment Variables

Add these to your `.env` file:

```env
# SMS Service Configuration
DEFAULT_SMS_SERVICE=twilio

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number
TWILIO_ENABLED=true

# Nexmo Configuration
NEXMO_API_KEY=your_nexmo_api_key
NEXMO_API_SECRET=your_nexmo_api_secret
NEXMO_FROM_NUMBER=your_nexmo_phone_number
NEXMO_ENABLED=false

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_FROM_NUMBER=your_aws_phone_number
AWS_SMS_ENABLED=false

# SMS Settings
SMS_NOTIFICATIONS_ENABLED=true
STORE_NAME=Edith's Store
```

## Usage

### In the Customer Management Interface

1. Navigate to the Customers page
2. Find the customer you want to send an SMS to
3. Click the SMS icon (📱) in the Actions column
4. Review the customer's current balance
5. Optionally customize the message
6. Click "Send SMS"

### Default Message Format

The default SMS message includes:
- Customer's current credit balance
- Recent transactions (last 3)
- Store branding

Example:
```
Hi John Doe,

Your current credit balance is ₱920.00.

Recent transactions:
8/20/2025: Added ₱200.00
8/19/2025: Added ₱45.00
8/19/2025: Deducted ₱100.00

Thank you for your business!
Edith's Store
```

## API Endpoints

### Send SMS to Customer
```
POST /api/customers/:id/send-sms
```

**Request Body:**
```json
{
  "message": "Custom message (optional)"
}
```

**Response:**
```json
{
  "message": "SMS sent successfully",
  "phone": "+639123456789",
  "messageContent": "SMS message content",
  "service": "twilio",
  "simulated": false
}
```

## Testing

The SMS service includes a simulation mode for testing:

1. Set the SMS service `enabled` to `false` in the config
2. SMS will be logged to console instead of being sent
3. Perfect for development and testing

## Troubleshooting

### Common Issues

1. **"Customer does not have a phone number"**
   - Ensure the customer has a valid phone number in their profile
   - Phone numbers should be in international format (e.g., +639123456789)

2. **"Failed to send SMS"**
   - Check your SMS service credentials
   - Verify your account has sufficient credits
   - Check the service status page

3. **Message not delivered**
   - Verify the phone number format
   - Check if the number is valid and active
   - Some countries have restrictions on SMS delivery

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_SMS=true
```

This will log detailed information about SMS attempts.

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Phone Validation**: Validate phone numbers before sending
4. **Message Content**: Sanitize user input in custom messages

## Cost Considerations

- Twilio: ~$0.0075 per SMS (US numbers)
- Nexmo: ~$0.0069 per SMS (US numbers)
- AWS SNS: ~$0.00645 per SMS (US numbers)

Prices vary by country and volume. Check your chosen provider's pricing page for current rates.

## Support

For issues with:
- **SMS Service**: Contact your SMS provider's support
- **Application**: Check the application logs and error messages
- **Configuration**: Verify your environment variables and settings
