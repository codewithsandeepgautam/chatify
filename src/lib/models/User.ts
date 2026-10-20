import mongoose, { Schema, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    color: { type: String, default: "#6366f1" },
  },
  { timestamps: true }
);

export const User: Model<any> = mongoose.models.User || mongoose.model("User", UserSchema);
