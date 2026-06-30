import { Request, Response } from "express";
import { hashPassword } from "@better-auth/utils/password";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "../../../database";
import { env } from "../../../config/env";

const getTransporter = () => {
  return nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.gmail.com",
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[Auth Controller] Forgot password endpoint hit");
    const { email } = req.body;
    console.log(`[Auth Controller] Email received: ${email}`);

    if (!email) {
      console.error("[Auth Controller] Error: Email is missing in request body");
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      console.log(`[Auth Controller] User found in database: ${user.id}`);
    } else {
      console.log(`[Auth Controller] User NOT found in database for email: ${email}`);
    }



    if (user) {
      // Generate a secure random token
      const resetToken = crypto.randomBytes(32).toString("hex");
      console.log("[Auth Controller] Reset token generated");

      // Hash the token with sha256 to store in the database
      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: expiresAt,
        },
      });
      console.log("[Auth Controller] Reset token securely hashed and saved to database");

      const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
      console.log("[Auth Controller] Reset URL generated");

      // Send the email
      if (env.SMTP_USER && env.SMTP_PASS) {
        try {
          const transporter = getTransporter();
          console.log("[Auth Controller] Attempting to send email via Nodemailer...");
          await transporter.sendMail({
            from: `"CareerAI" <${env.SMTP_USER}>`,
            to: user.email,
            subject: "CareerAI Password Reset",
            html: `
              <p>You requested a password reset for your CareerAI account.</p>
              <p>Please click the link below to reset your password:</p>
              <a href="${resetUrl}">${resetUrl}</a>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>This link will expire in 15 minutes.</p>
            `,
          });
          console.log("[Auth Controller] Password reset email successfully sent");
        } catch (emailError) {
          console.error("[Auth Controller] Failed to send email:", emailError);
          console.log("\n=======================================================");
          console.log("PASSWORD RESET LINK (Fallback due to email error)");
          console.log(resetUrl);
          console.log("=======================================================\n");
        }
      } else {
        console.log("\n=======================================================");
        console.log("PASSWORD RESET LINK (SMTP not configured)");
        console.log(resetUrl);
        console.log("=======================================================\n");
      }
    }
    
    // Return success to the client
    res.json({ message: "If that email address is in our database, we will send you an email to reset your password." });
  } catch (error) {
    console.error("[Auth Controller] Fatal error in forgotPassword:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[Auth Controller] Reset password endpoint hit");
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      console.error("[Auth Controller] Error: Token or new password missing");
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }

    // Hash the incoming token to compare with the database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("[Auth Controller] Searching for user with matching token");

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      console.error("[Auth Controller] Error: Invalid or expired token");
      res.status(400).json({ error: "Token is invalid or has expired" });
      return;
    }
    console.log(`[Auth Controller] User validated for password reset: ${user.id}`);

    // Hash the new password with Better Auth's native hashing utility
    const hashedPassword = await hashPassword(newPassword);
    console.log("[Auth Controller] New password securely hashed using Better Auth utils");

    // Update the user's password in the Account table
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });
      console.log("[Auth Controller] Updated existing credential account");
    } else {
      // Fallback for Google-only users creating a password for the first time
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.email,
          providerId: "credential",
          password: hashedPassword,
        },
      });
      console.log("[Auth Controller] Created new credential account for user");
    }

    // Clear reset tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    console.log("[Auth Controller] Reset tokens cleared from database");

    res.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error("[Auth Controller] Fatal error in resetPassword:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};
