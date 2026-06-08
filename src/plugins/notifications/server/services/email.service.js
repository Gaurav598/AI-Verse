'use strict';

/**
 * Email Service
 * AI Content Intelligence Platform
 *
 * Nodemailer-based email service with template support.
 * Supports SMTP and SendGrid providers.
 */

const nodemailer = require('nodemailer');
const logger = require('../../services/logger.service');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  if (provider === 'sendgrid') {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } else {
    // Default SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

const emailService = {
  /**
   * Send an email
   */
  async send({ to, subject, html, text, from }) {
    const emailFrom = from || process.env.EMAIL_FROM || 'noreply@aicms.com';

    try {
      const info = await getTransporter().sendMail({
        from: emailFrom,
        to,
        subject,
        html,
        text: text || html?.replace(/<[^>]*>/g, ''),
      });

      logger.info('Email sent', { to, subject, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error('Email send failed', { to, subject, error: err.message });
      throw err;
    }
  },

  /**
   * Article approved email template
   */
  articleApprovedEmail(articleTitle, articleUrl) {
    return {
      subject: `🎉 Your article has been approved: "${articleTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Article Approved!</h2>
          <p>Great news! Your article <strong>"${articleTitle}"</strong> has been approved and is ready for publishing.</p>
          <a href="${articleUrl}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            View Article
          </a>
        </div>
      `,
    };
  },

  /**
   * Article rejected email template
   */
  articleRejectedEmail(articleTitle, comment) {
    return {
      subject: `Article needs revision: "${articleTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Revision Required</h2>
          <p>Your article <strong>"${articleTitle}"</strong> has been sent back for revision.</p>
          ${comment ? `<blockquote style="border-left: 4px solid #f59e0b; padding-left: 1rem;">${comment}</blockquote>` : ''}
          <p>Please make the necessary changes and resubmit for review.</p>
        </div>
      `,
    };
  },

  /**
   * Email verification template
   */
  emailVerificationEmail(verificationUrl) {
    return {
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email</h2>
          <p>Click the button below to verify your email address.</p>
          <a href="${verificationUrl}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Verify Email
          </a>
          <p style="color: #6b7280; font-size: 0.875rem;">This link expires in 24 hours.</p>
        </div>
      `,
    };
  },

  /**
   * Password reset email template
   */
  passwordResetEmail(resetUrl) {
    return {
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Reset Password
          </a>
          <p style="color: #6b7280; font-size: 0.875rem;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };
  },
};

module.exports = emailService;
