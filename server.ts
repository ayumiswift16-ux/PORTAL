import express from "express";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import "dotenv/config";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route to send verification code
  app.post("/api/send-verification", async (req, res) => {
    console.log("POST /api/send-verification received for:", req.body.email);
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    // Load credentials
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    // Check if credentials are missing OR still set to placeholders from .env.example
    const isNotConfigured = !EMAIL_USER || !EMAIL_PASS || 
                           EMAIL_USER.includes("your-email") || 
                           EMAIL_PASS.includes("xxxx-xxxx");

    if (isNotConfigured) {
      console.warn("EMAIL_USER or EMAIL_PASS not properly configured. Fallback to server console.");
      console.log(`\n--- VERIFICATION CODE FOR ${email}: [ ${code} ] ---\n`);
      return res.json({ 
        success: true, 
        message: "Email credentials not configured in Settings. For now, the code has been logged to the server console for you to proceed." 
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });

      // Verify connection configuration
      try {
        await transporter.verify();
      } catch (verifyError: any) {
        console.error("SMTP Configuration Error:", verifyError);
        if (verifyError.responseCode === 535 || verifyError.message.includes('Invalid login')) {
          return res.status(401).json({ 
            error: "Gmail Authentication Failed", 
            message: "Invalid credentials. Please make sure you are using a 16-character 'App Password' from Google, not your regular account password.",
            code: "AUTH_FAILED"
          });
        }
        throw verifyError;
      }

      const mailOptions = {
        from: `"School Portal" <${EMAIL_USER}>`,
        to: email,
        subject: "Your Professor Account Verification Code",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #10b981;">Professor Account Verification</h2>
            <p>Your 6-digit verification code to join the school portal is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; margin: 20px 0;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #666;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error) {
      console.error("Email sending error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 3000 }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message || "An unexpected error occurred" 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
