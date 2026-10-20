import mongoose, { Schema, type Model } from "mongoose";

const AttachmentRefSchema = new Schema(
  {
    file: { type: Schema.Types.ObjectId, ref: "Attachment", required: true },
    name: String,
    mime: String,
    size: Number,
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User" }, // system message me null
    type: { type: String, enum: ["text", "system"], default: "text" },
    text: { type: String, default: "", maxlength: 5000 },
    attachments: [AttachmentRefSchema],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, _id: -1 });

export const Message: Model<any> = mongoose.models.Message || mongoose.model("Message", MessageSchema);
