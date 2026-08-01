import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    avatar: {
      type : String,
      default: null
    },

    coverImage: {
      type : String,
      default: null
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    refreshToken: {
      type: String,
      select: false
    },

    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },

    lockUntil: {
      type: Date,
      default: null,
      select: false
    },

    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

export default User;
