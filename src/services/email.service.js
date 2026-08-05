import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { 
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });

export const sendEmailOTP = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"Sociora" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify Your Email - Sociora",

      text: `Your Sociora verification OTP is ${otp}. This OTP is valid for 5 minutes. Do not share this OTP with anyone.`,

      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Email Verification</title>
          </head>

          <body style="
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
            font-family: Arial, Helvetica, sans-serif;
          ">

            <div style="
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            ">

              <!-- Header -->
              <div style="
                background-color: #18181b;
                padding: 25px;
                text-align: center;
              ">
                <h1 style="
                  color: #ffffff;
                  margin: 0;
                  font-size: 28px;
                ">
                  Sociora
                </h1>
              </div>

              <!-- Content -->
              <div style="padding: 35px 30px;">

                <h2 style="
                  margin-top: 0;
                  color: #18181b;
                ">
                  Verify Your Email
                </h2>

                <p style="
                  color: #52525b;
                  font-size: 15px;
                  line-height: 1.6;
                ">
                  Thank you for creating an account with Sociora.
                  Please use the OTP below to verify your email address.
                </p>

                <!-- OTP -->
                <div style="
                  margin: 30px 0;
                  text-align: center;
                ">
                  <div style="
                    display: inline-block;
                    padding: 15px 30px;
                    background-color: #f4f4f5;
                    border-radius: 8px;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #18181b;
                  ">
                    ${otp}
                  </div>
                </div>

                <p style="
                  color: #71717a;
                  font-size: 14px;
                  text-align: center;
                ">
                  This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <p style="
                  color: #71717a;
                  font-size: 14px;
                  line-height: 1.6;
                ">
                  For your security, please do not share this OTP with
                  anyone. Sociora will never ask you for your OTP.
                </p>

              </div>

              <!-- Footer -->
              <div style="
                padding: 20px 30px;
                background-color: #fafafa;
                text-align: center;
              ">
                <p style="
                  margin: 0;
                  color: #a1a1aa;
                  font-size: 12px;
                ">
                  © ${new Date().getFullYear()} Sociora. All rights reserved.
                </p>
              </div>

            </div>

          </body>
        </html>
      `,
    });

    console.log("Verification email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("Verification email error:", error.message);
    throw error;
  }
};

export const sendForgotPasswordOTP = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"Sociora" <${process.env.EMAIL}>`,
      to: email,
      subject: "Password Reset OTP - Sociora",

      text: `Your Sociora password reset OTP is ${otp}. This OTP is valid for 5 minutes. If you did not request a password reset, please ignore this email.`,

      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>Password Reset</title>
          </head>

          <body style="
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
            font-family: Arial, Helvetica, sans-serif;
          ">

            <div style="
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            ">

              <!-- Header -->
              <div style="
                background-color: #18181b;
                padding: 25px;
                text-align: center;
              ">
                <h1 style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 28px;
                ">
                  Sociora
                </h1>
              </div>

              <!-- Content -->
              <div style="padding: 35px 30px;">

                <h2 style="
                  margin-top: 0;
                  color: #18181b;
                ">
                  Reset Your Password
                </h2>

                <p style="
                  color: #52525b;
                  font-size: 15px;
                  line-height: 1.6;
                ">
                  We received a request to reset your Sociora account
                  password.
                </p>

                <p style="
                  color: #52525b;
                  font-size: 15px;
                  line-height: 1.6;
                ">
                  Use the OTP below to continue with your password reset:
                </p>

                <!-- OTP -->
                <div style="
                  margin: 30px 0;
                  text-align: center;
                ">
                  <div style="
                    display: inline-block;
                    padding: 15px 30px;
                    background-color: #f4f4f5;
                    border-radius: 8px;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #18181b;
                  ">
                    ${otp}
                  </div>
                </div>

                <p style="
                  color: #71717a;
                  font-size: 14px;
                  text-align: center;
                ">
                  This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <!-- Security Notice -->
                <div style="
                  margin-top: 25px;
                  padding: 15px;
                  background-color: #fafafa;
                  border-left: 4px solid #18181b;
                  border-radius: 4px;
                ">
                  <p style="
                    margin: 0;
                    color: #52525b;
                    font-size: 13px;
                    line-height: 1.6;
                  ">
                    <strong>Security Notice:</strong><br />
                    If you did not request a password reset,
                    you can safely ignore this email.
                    Never share this OTP with anyone.
                  </p>
                </div>

              </div>

              <!-- Footer -->
              <div style="
                padding: 20px 30px;
                background-color: #fafafa;
                text-align: center;
              ">
                <p style="
                  margin: 0;
                  color: #a1a1aa;
                  font-size: 12px;
                ">
                  © ${new Date().getFullYear()} Sociora.
                  All rights reserved.
                </p>
              </div>

            </div>

          </body>
        </html>
      `,
    });

    console.log("Password reset email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("Password reset email error:", error.message);
    throw error;
  }
};

