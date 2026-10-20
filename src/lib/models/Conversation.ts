import mongoose, { Schema, type Model } from "mongoose";

const LastMessageSchema = new Schema(
  {
    text: String,
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    kind: { type: String, enum: ["text", "image", "pdf", "system"], default: "text" },
    createdAt: Date,
  },
  { _id: false }
);

const ConversationSchema = new Schema(
  {
    // direct = 1-to-1, self = apni khud ki chat, group = group chat
    type: { type: String, enum: ["direct", "self", "group"], required: true },
    name: { type: String, trim: true, maxlength: 80 },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    // direct/self chat duplicate na bane isliye unique key
    directKey: { type: String, unique: true, sparse: true },
    lastMessage: { type: LastMessageSchema, default: null },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ members: 1, lastMessageAt: -1 });

export const Conversation: Model<any> =
  mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);
