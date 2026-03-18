import nodemailer from "nodemailer";
import { google } from "googleapis";
import config from "../config/config.js";

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

transporter.verify((error, success) => {
  if (error) {
    console.log("Error connecting to email server", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

export const sendEmail = async (to, subject, text, html) => {
  try {
    const accessToken = await oAuth2Client.getAccessToken();
    const token = typeof accessToken === "string" ? accessToken : accessToken?.token;

    if (!token) {
      throw new Error("Failed to generate Google OAuth access token");
    }

    const info = await transporter.sendMail({
      from: `"Anish" <${config.GOOGLE_USER}>`,
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
    console.log("Message sent: %s", info.messageId);
    console.log("Preview url: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.log("Error sending email", error);
    throw error;
  }
};
