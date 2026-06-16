# AMI Backend
 
This is the backend for AMI, a mental health support app that uses language games and an AI chatbot to help users. Built with Node.js, TypeScript, Express, and MongoDB.
 
If you're jumping into this codebase for the first time, read this top to bottom. It'll save you a lot of head-scratching.
 
---
 
## What does this app actually do?
 
At its core, AMI gives users three things:
 
1. **Language games** — three types of cognitive games (find, match, and speak) that help with language recall and mental engagement.
2. **An AI chatbot** — a conversational assistant that tracks mental health signals like distress and topic patterns over time.
3. **Admin content** — stuff like About Us, Privacy Policy, and Terms & Conditions that admins update from a dashboard.
Users sign up, play games, chat with the bot, and get push notifications. Admins and super admins manage everything else.
 
---
 
## Tech stack
 
Nothing exotic here:
 
- **Node.js + TypeScript** — the whole backend
- **Express.js** — routing and middleware
- **MongoDB + Mongoose** — database with schema validation
- **bcrypt** — password hashing
- **JWT** — access and refresh token auth
- **Firebase (FCM)** — push notifications to mobile
---
 
## Project structure
 
```
src/
├── app/
│   └── config/          # env vars, bcrypt config, db connection
├── modules/
│   ├── user/            # auth, profiles, roles
│   ├── gameone/         # all three game modes live here
│   ├── chatbot/         # conversation memory & AI responses
│   ├── notification/    # push notification records
│   └── settings/        # about us, privacy policy, terms
```
 
Each module has its own model, interface, and (usually) service + controller. Keep new features in their own module folder — don't dump things into an existing one just because it's close enough.
 
---
 
## Database collections at a glance
 
There are 8 collections total. Most things revolve around `users`:
 
```
users
 ├── gameone            (one user → many game sessions)
 ├── conversationmemorys  (one user → many chatbot turns)
 └── notifications      (one user → many notifications)
 
aboutus                 (no user link — admin managed)
privacypolicys          (no user link — admin managed)
termsConditions         (no user link — admin managed)
```
 
`gameone` also has an embedded `tileClicks` array inside each document — that's not a separate collection, it lives inside each game session.
 
---
 
## The games
 
This is probably the most interesting part of the codebase, so let's go through each mode properly.
 
All three games share the same MongoDB collection (`gameone`) and the same base fields. What changes is the `gameMode` value and which fields are required.
 
---
 
### 🔵 OC — Object Categorisation *(Find Game)*
 
The player sees a grid of sprite tiles and has to **tap the correct one** based on an instruction like *"Find the fruit"* or *"Which one is an animal?"*
 
This is a recognition game — can you spot the right object from a bunch of options?
 
**What gets saved:**
 
Every tap the player makes is stored as a `TileClick` inside the session:
 
```ts
{
  spriteName: "banana",   // which tile they tapped
  wasCorrect: true,       // right or wrong?
  clickTime: 3.87         // how many seconds in when they tapped
}
```
 
By the time the session ends, you have a full picture: how long they took, how many hints they used, every tap in order, and which words they got right vs wrong.
 
**Required fields:** `instructionText`, `tileClicks`, `completionTime`, `hintsUsed`, `valid_words`, `invalid_words`
 
---
 
### 🟡 UOT — Utility of Things *(Match Game)*
 
Very similar to OC under the hood — same tile-tap mechanic, same required fields, same schema. The difference is the *type of question*.
 
Instead of *"find the animal"*, UOT asks things like *"which one do you use to cut bread?"* or *"what would you take to the beach?"*
 
This is a **functional matching** game — it's not about recognising what something is, it's about understanding what it's *for*.
 
**Required fields:** Same as OC — `instructionText`, `tileClicks`, `completionTime`, `hintsUsed`, `valid_words`, `invalid_words`
 
---
 
### 🟢 VF — Verbal Fluency *(Speak Game)*
 
This one is completely different. No tiles, no tapping. The player **listens to an audio clip and speaks their answer out loud**.
 
The flow looks like this:
 
1. The app plays an audio clip (`audioClipId` / `audioClipUrl`)
2. The player can replay it as many times as they need — each replay gets timestamped in `repeatButtonClicks`
3. The player speaks their answer, which gets recorded (`recordingId`)
4. That recording gets transcribed or evaluated and saved as `playerResponse`
There's no completion time tracked here, no hints, no tile clicks. It's a different kind of challenge — verbal and expressive rather than visual and reactive.
 
**Required fields:** `audioClipId`, `recordingId`, `playerResponse`
**Optional but tracked:** `audioClipUrl`, `repeatButtonClicks`
 
---
 
### Side-by-side comparison
 
| | OC (Find) | UOT (Match) | VF (Speak) |
|---|---|---|---|
| Input method | Tap tiles | Tap tiles | Speak aloud |
| Stimulus | Visual grid + text | Visual grid + text | Audio clip |
| Tests | Recognition | Functional knowledge | Verbal recall |
| Tile clicks tracked | ✅ | ✅ | ❌ |
| Completion time | ✅ | ✅ | ❌ |
| Hints supported | ✅ | ✅ | ❌ |
| Replay tracking | ❌ | ❌ | ✅ |
| Voice recording | ❌ | ❌ | ✅ |
 
---
 
## Users & auth
 
### Roles
 
There are three roles: `user`, `admin`, and `superAdmin`. Most API routes check for role before doing anything sensitive. The role is set on signup and can be changed by an admin.
 
Users also have a `status` — either `isProgress` (active) or `blocked`. Blocked users can't do anything meaningful.
 
### Passwords
 
Passwords are hashed with bcrypt before they ever hit the database. The `password` field has `select: 0` on the schema, which means it's excluded from every query by default. If you need it (e.g. for login), you have to explicitly ask for it with `.select('+password')`.
 
The salt rounds come from `config.bcrypt_salt_rounds` — set it in your `.env`.
 
### JWT
 
We use access + refresh tokens. There's a static method `isJWTIssuesBeforePasswordChange` on the User model that checks whether a token was issued *before* the user last changed their password. If it was, we reject it — even if the token is otherwise valid. This prevents old tokens from working after a password reset.
 
### Email / phone verification
 
There's a `verificationCode` field (a number, indexed) and an `isVerify` flag. The flow for verification isn't in the model layer — that's handled in the service — but the schema is set up to support OTP-based verification for both email and phone.
 
---
 
## The chatbot
 
Every conversation turn gets saved as a `ConversationMemory` document. This isn't just a chat log — each record includes AI-generated metadata about the conversation:
 
- `question_category` — what kind of question was asked
- `conversation_topic` — the topic label
- `summary` — a short summary of the exchange
- `ami_trigger` — did the conversation touch a health-related keyword?
- `mental_distress` — did the user show signs of distress?
This metadata is what makes the chatbot "remember" context over time and lets the app flag users who might need extra support.
 
---
 
## Notifications
 
Pretty straightforward — every notification sent to a user gets stored in the `notifications` collection with a `title`, `message`, and the `userId` it belongs to. The actual push delivery happens via FCM using the `fcm` token stored on the user.
 
---
 
## Soft deletes
 
Nothing in this app is ever truly deleted. Every collection has an `isDelete` boolean field (default `false`). When something is "deleted", we just flip that flag to `true`.
 
All three query hooks (`find`, `findOne`, `aggregate`) automatically filter out soft-deleted records so you never have to think about it:
 
```ts
Schema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});
```
 
You never have to add `{ isDelete: false }` to your queries manually — the hooks handle it.
 
---
 
## Settings (About Us, Privacy Policy, Terms)
 
Three separate collections, each with a single content field and `isDelete`. Admins update these through the dashboard. There are no user references here — they're purely content documents.
 
One thing to know: the `TermsConditions` collection name accidentally has a leading space in the model registration (`" termsConditions"`). This creates a collection in MongoDB with a space in the name. It works, but it's a footgun — see Known Issues below.
 
---
 
## Environment variables
 
Create a `.env` file in the root. Here's what you need:
 
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ami
 
# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
 
# Security
BCRYPT_SALT_ROUNDS=12
 
# Firebase push notifications
FCM_SERVER_KEY=your_fcm_server_key_here
```
 
---
 
## Getting started
 
```bash
# 1. Clone and install
git clone https://github.com/your-org/ami-backend.git
cd ami-backend
npm install
 
# 2. Set up your environment
cp .env.example .env
# open .env and fill in your values
 
# 3. Run in development (hot reload)
npm run dev
 
# 4. Build and run for production
npm run build
npm start
```
 
Make sure MongoDB is running before you start the server. The app will crash on startup if it can't connect.
 
---
 
## Known issues worth fixing
 
These are bugs that exist in the current codebase. None of them break the app visibly, which is exactly why they're dangerous.
 
### 1. `isDeleted` vs `isDelete` in the chatbot model
 
The `ConversationMemory` schema defines the field as `isDeleted` (with a `d`), but the soft delete hooks filter on `isDelete` (without a `d`). They don't match, so soft-deleting a chatbot record does nothing — it'll still show up in every query.
 
```ts
// chatbot.model.ts — change this:
isDeleted: { type: Boolean, default: false }
 
// to this:
isDelete: { type: Boolean, default: false }
```
 
### 2. `findOne` hook calls `this.find()` instead of `this.findOne()`
 
In `gameone.model.ts` and `chatbot.model.ts`, the `pre('findOne')` hook accidentally calls `this.find(...)` instead of `this.findOne(...)`. This means the soft delete filter doesn't apply correctly when you do a `findOne` query on those collections.
 
```ts
// Wrong (in gameone and chatbot models):
TGameOneSchema.pre('findOne', function (next) {
  this.find({ isDelete: { $ne: true } }); // should be this.findOne
  next();
});
```
 
### 3. Leading space in the `termsConditions` collection name
 
In `settings.model.ts`, the collection name is registered as `" termsConditions"` with a space at the start. MongoDB creates the collection with that exact name, including the space. It works, but it's confusing and will cause issues if you ever try to query it directly.
 
```ts
// Wrong:
model<TTermsConditions, TermsConditionsModel>(" termsConditions", TermsConditionSchema)
 
// Fix — remove the space:
model<TTermsConditions, TermsConditionsModel>("termsConditions", TermsConditionSchema)
```
 
### 4. `TileClick` has no `_id`
 
The `TileClickSchema` is defined with `{ _id: false }`. This is intentional — tile clicks are treated as plain data inside a game session, not as independently addressable documents. Just know that if you ever need to update a specific tile click, you'll have to match on its content fields rather than an ID

# Project Deployment & Infrastructure Setup

## Overview
This project is a full-stack application consisting of a backend API, an admin dashboard frontend, and cloud-based media and communication services. The system is deployed using cloud infrastructure with automated CI/CD pipelines for continuous deployment.

---

##  Deployment Architecture

### 1. Backend Deployment (AWS)
- The backend is hosted on **Amazon Web Services (AWS)**.
- It provides REST APIs for the frontend and handles all core business logic.
- Deployed using:
  - AWS EC2 / Elastic Beanstalk
  - PM2 process manager (Node.js production environment)
- Environment variables are securely managed using `.env`.

---

### 2. Frontend Deployment (Admin Dashboard - GoDaddy)
- The admin dashboard is built with **React (Vite)**.
- Deployed on **GoDaddy hosting (cPanel / FTP)**.
- Production build is generated using `npm run build`.
- The frontend communicates with AWS-hosted backend APIs.

---

## 🔄 CI/CD (Continuous Integration & Continuous Deployment)

### CI/CD Pipeline Overview
- The project includes **automated CI/CD pipeline** for both backend and frontend.
- Every push to the main branch triggers an automated deployment process.

### Backend CI/CD (AWS)
- Source control: GitHub / GitLab
- Pipeline tool: GitHub Actions / AWS CodePipeline
- Steps:
  1. Code push to repository
  2. Automated build & dependency install
  3. Run tests (if applicable)
  4. Deploy to AWS EC2 / Elastic Beanstalk
  5. Restart backend service using PM2
- Ensures zero-downtime or minimal downtime deployments.

---

### Frontend CI/CD (GoDaddy Deployment)
- Frontend build is automatically generated via CI pipeline.
- Steps:
  1. Push to repository
  2. Install dependencies
  3. Run build (`npm run build`)
  4. Upload build files to GoDaddy via FTP / cPanel deployment script
- Ensures updated UI is always live after deployment.

---

##  Media Storage (AWS S3)
- All audio and video recordings are stored in Amazon S3 Bucket.
- Features:
  - Secure file storage
  - Scalable media hosting
  - Fast delivery via AWS infrastructure
- Uploads are handled directly from backend using AWS SDK.

---

##  Email Service (Brevo)
- Email service is integrated using Brevo (Sendinblue)**.
- Currently facing issues:
  - SMTP/API configuration errors
  - Email delivery failures
- Needs troubleshooting for:
  - API key validation
  - Domain authentication (SPF/DKIM)
  - Sending limits

---

##  SMS / OTP Service (Twilio)
- Twilio is used for SMS/OTP verification.
- Currently not working due to setup issues:
  - Invalid credentials or configuration mismatch
  - Messaging service setup not completed
- Requires reconfiguration and testing in production.

---

##  Known Issues
- Twilio SMS service is not functional (configuration issue)
- Brevo email service is not sending emails
- Requires environment variable review and API re-validation

---

##  Tech Stack Summary
- **Backend:** Node.js, Express.js
- **Frontend:** React (Vite), TypeScript, Tailwind CSS
- **Database:** MongoDB
- **Cloud Storage:** AWS S3
- **Backend Hosting:** AWS
- **Frontend Hosting:** GoDaddy
- **CI/CD:** GitHub Actions / AWS CodePipeline
- **Email Service:** Brevo (issue pending)
- **SMS Service:** Twilio (issue pending)

---

##  Future Improvements
- Fix Twilio SMS integration
- Resolve Brevo email issues
- Improve CI/CD pipeline with rollback strategy
- Add monitoring (AWS CloudWatch / Sentry)
- Implement automated testing in pipeline

--
