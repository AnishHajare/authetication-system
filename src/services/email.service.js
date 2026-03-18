import nodemailer from "nodemailer";
import { google } from "googleapis";
import config from "../config/config.js";
import { logger } from "../utils/logger.js";

const oAuth2Client = new google.auth.OAuth2(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);
oAuth2Client.setCredentials({
  refresh_token: config.GOOGLE_REFRESH_TOKEN,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: config.GOOGLE_USER,
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    refreshToken: config.GOOGLE_REFRESH_TOKEN,
  },
});

if (config.NODE_ENV !== "test") {
  transporter.verify((error, success) => {
    if (error) {
      logger.error("Error connecting to email server", {
        error: error.message,
      });
    } else {
      logger.info("Email server is ready to send messages", {
        success,
      });
    }
  });
}

export const sendEmail = async (to, subject, text, html) => {
  try {
    const accessToken = await oAuth2Client.getAccessToken();
    const token = typeof accessToken === "string" ? accessToken : accessToken?.token;

    if (!token) {
      throw new Error("Failed to generate Google OAuth access token");
    }

    const info = await transporter.sendMail({
      from: `"${config.MAIL_FROM_NAME}" <${config.GOOGLE_USER}>`,
      to,
      subject,
      text,
      html,
      auth: {
        type: "OAuth2",
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN,
        accessToken: token,
      },
    });
    logger.info("Email sent", {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
      to,
      subject,
    });
  } catch (error) {
    logger.error("Error sending email", {
      error: error.message,
      to,
      subject,
    });
    throw error;
  }
};
