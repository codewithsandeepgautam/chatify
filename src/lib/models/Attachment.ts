import mongoose, { Schema, type Model } from "mongoose";

// Image / PDF abhi MongoDB me hi (Buffer) save hoti hai. Baad me S3/Cloudinary par shift karna ho
// to sirf upload + files route badalna padega.
const AttachmentSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    uploader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
    attached: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Attachment: Model<any> =
  mongoose.models.Attachment || mongoose.model("Attachment", AttachmentSchema);
