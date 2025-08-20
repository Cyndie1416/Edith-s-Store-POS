const smsConfig = require('../config/sms');

// SMS Service Class
class SMSService {
  constructor() {
    this.config = smsConfig;
    this.service = this.config.defaultService;
  }

  // Send SMS using the configured service
  async sendSMS(phoneNumber, message) {
    try {
      switch (this.service) {
        case 'twilio':
          return await this.sendViaTwilio(phoneNumber, message);
        case 'nexmo':
          return await this.sendViaNexmo(phoneNumber, message);
        case 'aws':
          return await this.sendViaAWS(phoneNumber, message);
        default:
          return await this.sendViaTwilio(phoneNumber, message);
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  // Twilio SMS Service
  async sendViaTwilio(phoneNumber, message) {
    if (!this.config.twilio.enabled) {
      console.log('Twilio SMS (simulated):', { phoneNumber, message });
      return { success: true, service: 'twilio', simulated: true };
    }

    try {
      const twilio = require('twilio');
      const client = twilio(this.config.twilio.accountSid, this.config.twilio.authToken);
      
      const result = await client.messages.create({
        body: message,
        from: this.config.twilio.fromNumber,
        to: phoneNumber
      });
      
      return { success: true, service: 'twilio', messageId: result.sid, simulated: false };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }

  // Nexmo/Vonage SMS Service
  async sendViaNexmo(phoneNumber, message) {
    if (!this.config.nexmo.enabled) {
      console.log('Nexmo SMS (simulated):', { phoneNumber, message });
      return { success: true, service: 'nexmo', simulated: true };
    }

    try {
      // Uncomment and install nexmo package: npm install nexmo
      // const Nexmo = require('nexmo');
      // const nexmo = new Nexmo({
      //   apiKey: this.config.nexmo.apiKey,
      //   apiSecret: this.config.nexmo.apiSecret
      // });
      
      // const result = await new Promise((resolve, reject) => {
      //   nexmo.message.sendSms(
      //     this.config.nexmo.fromNumber,
      //     phoneNumber,
      //     message,
      //     (err, responseData) => {
      //       if (err) reject(err);
      //       else resolve(responseData);
      //     }
      //   );
      // });
      
      // return { success: true, service: 'nexmo', messageId: result.messages[0]['message-id'] };
      
      // For now, simulate the API call
      console.log('Nexmo SMS would be sent:', { phoneNumber, message });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, service: 'nexmo', simulated: true };
    } catch (error) {
      console.error('Nexmo SMS error:', error);
      throw error;
    }
  }

  // AWS SNS SMS Service
  async sendViaAWS(phoneNumber, message) {
    if (!this.config.aws.enabled) {
      console.log('AWS SNS SMS (simulated):', { phoneNumber, message });
      return { success: true, service: 'aws', simulated: true };
    }

    try {
      // Uncomment and install aws-sdk package: npm install aws-sdk
      // const AWS = require('aws-sdk');
      // AWS.config.update({
      //   accessKeyId: this.config.aws.accessKeyId,
      //   secretAccessKey: this.config.aws.secretAccessKey,
      //   region: this.config.aws.region
      // });
      
      // const sns = new AWS.SNS();
      // const params = {
      //   Message: message,
      //   PhoneNumber: phoneNumber
      // };
      
      // const result = await sns.publish(params).promise();
      // return { success: true, service: 'aws', messageId: result.MessageId };
      
      // For now, simulate the API call
      console.log('AWS SNS SMS would be sent:', { phoneNumber, message });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, service: 'aws', simulated: true };
    } catch (error) {
      console.error('AWS SNS SMS error:', error);
      throw error;
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    // Basic validation - you might want to use a library like libphonenumber-js
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  // Truncate message if it exceeds SMS length limit
  truncateMessage(message) {
    const maxLength = this.config.settings.maxMessageLength;
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }
}

module.exports = new SMSService();
