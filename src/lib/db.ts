import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  global._mongoosePromise ??= mongoose.connect(uri);
  try {
    await global._mongoosePromise;
  } catch (err) {
    global._mongoosePromise = undefined;
    throw err;
  }
  return mongoose;
}
