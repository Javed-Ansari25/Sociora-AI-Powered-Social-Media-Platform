import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // unique already creates the index, no separate index:true needed
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_.]+$/, 'Username can only contain lowercase letters, numbers, underscores and dots'],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    avatar: {
      type: String,
      default: null,
    },

    coverImage: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    isActive: {
      type: Boolean,
      default: false, // becomes true only after email verification (see verifyEmail service)
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

  },
  {
    timestamps: true,
  },
);

// INDEXES
userSchema.index({ role: 1, isActive: 1, isBlocked: 1 }); // admin listing/filtering
userSchema.index({ createdAt: -1 }); // newest-users queries
userSchema.index({ username: 'text', name: 'text', bio: 'text' }); // search

// HOOKS
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return null;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    return null;
  }
});

// INSTANCE METHODS
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// JSON OUTPUT SAFETY 
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;