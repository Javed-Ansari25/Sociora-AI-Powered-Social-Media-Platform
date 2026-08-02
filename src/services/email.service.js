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
      from: process.env.EMAIL, 
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`
    });
    console.log("Mail sent:", info.response);
  } catch (err) {
    console.error("Mail error:", err.message); 
    throw err;
  }
};

