/**
 * Centralized Email Configuration for AgriConnect
 *
 * All outgoing application emails are sent from hello.agriconnect@gmail.com
 * with the sender name 'AgriConnect'.
 */

export const EMAIL_CONFIG = {
  senderName: 'AgriConnect',
  senderEmail: 'hello.agriconnect@gmail.com',
  senderFrom: 'AgriConnect <hello.agriconnect@gmail.com>',
  supportEmail: 'hello.agriconnect@gmail.com',
  smtp: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
  },
} as const;

export default EMAIL_CONFIG;
