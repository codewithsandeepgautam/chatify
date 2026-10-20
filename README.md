# Chatly — Realtime Chat App

Next.js (App Router) + Node.js (custom server + Socket.io) + MongoDB (Mongoose) + shadcn/ui + Tailwind + TypeScript.

## Features
- **Personal chat** — khud ko message karo (notes, links, images, PDF)
- **Single chat** — kisi bhi user se 1-to-1 (duplicate chat nahi banti)
- **Group chat** — group banao, members add/remove, rename, leave (admin controls)
- **Image + PDF** bhejo (drag & drop, paste, multi-select). Files abhi **MongoDB me hi** save hoti hain
- Realtime: new message, typing indicator, online/offline, read receipts (✓ / ✓✓), unread badge
- Pagination (purane messages scroll karne par load), date separators, image lightbox, PDF open/download
- Login/Signup (JWT httpOnly cookie), dark mode, mobile responsive UI

## Setup (3 steps)
1. **MongoDB chalao** — local (`mongodb://127.0.0.1:27017`) ya Atlas ka connection string.
2. `.env.local` me values check karo (`.env.example` dekho):
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/chatly
   JWT_SECRET=koi-lamba-random-string
   ```
3. Install + run:
   ```bash
   npm install
   npm run dev
   ```
   Browser me `http://localhost:3000` kholo.

**Test kaise karein:** ek normal window me aur ek incognito window me 2 alag account banao, phir ek se doosre ko message / image / PDF bhejo.

Production: `npm run build && npm start` (HTTPS par ho to `COOKIE_SECURE=true` karo).

> `npm run dev` me `next dev` nahi, `node server.js` chalta hai — kyunki Socket.io aur Next.js ek hi port par chalte hain.

## Folder structure
```
server.js                      Node server: Next.js + Socket.io (auth, presence, typing)
src/
  app/
    (auth)/login, register     Auth pages
    chat/page.tsx              Main chat page (server-side auth check)
    api/
      auth/*                   register, login, logout, me
      users                    user search
      conversations            list / create (direct, group)
      conversations/[id]       group rename, add/remove member, leave
      conversations/[id]/messages   GET (pagination) / POST (send)
      conversations/[id]/read  mark as read
      upload                   image/PDF -> MongoDB
      files/[id]               file serve (sirf members ko)
  lib/
    models/                    User, Conversation, Message, Attachment (Mongoose)
    auth.ts, db.ts, socket.ts, serialize.ts, chat-service.ts
  hooks/
    use-chat.ts                Poori chat state + socket + actions
    use-user-search.ts
  components/
    ui/                        shadcn components
    chat/                      sidebar, chat-window, message-bubble, message-input, dialogs...
    auth/auth-form.tsx
```

## Notes
- File limit: 10 MB per file (MongoDB document limit 16 MB). Allowed: PNG, JPG, WEBP, GIF, PDF.
- Baad me S3/Cloudinary par shift karna ho to sirf `api/upload` aur `api/files/[id]` badalna padega.
- Files sirf usi conversation ke members dekh sakte hain (har request par membership check).
- Naya shadcn component chahiye to `npx shadcn@latest add <name>` (`components.json` ready hai).
