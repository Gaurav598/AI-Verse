# AIverse Gap Analysis

## Current State vs Target Vision

### 1. Backend Architecture (Strapi → AIverse API)
**Current:** Strapi is configured with PostgreSQL, Redis, and BullMQ. It has legacy CMS collections (`article`, `category`, `tag`) and new AIverse collections (`workspace`, `conversation`, `message`, `prompt`).
**Target:** A robust backend acting exclusively as an API and persistence layer for the AIverse workspace. No CMS concepts.
**Action:**
* **Keep:** PostgreSQL, Redis, BullMQ, Winston Logger, Auth, Rate Limiting, existing Gemini services.
* **Remove/Hide:** `article`, `category`, `tag`, `author`, `comment` collections and their associated AI plugins (or repurpose them).
* **Create:** `tool_run` and `generated_output` collections to track specific tool executions and assets.
* **Update:** Expose necessary REST APIs for Workspaces, Conversations, Messages, and Prompts so the Next.js frontend can perform CRUD operations.

### 2. Frontend Application (Next.js)
**Current:** A stunning Next.js 14 frontend exists with `/landing`, `/auth`, `/dashboard`, `/chat`, `/code`, `/image`, and `/video` UI. The `/chat` and `/code` modules have working Gemini streaming integrations built directly into Next.js API routes.
**Target:** A fully functional frontend that streams from Gemini while seamlessly persisting data to the backend. Complete workspace organization.
**Action:**
* **Keep:** The UI components, dark theme, styling, and existing Gemini streaming API routes.
* **Create:** `/workspaces`, `/prompts`, and `/settings` pages.
* **Integrate:** Implement data fetching/saving. After a chat stream completes, Next.js should POST the conversation and message data to the backend API to persist history.
* **Integrate:** Hook up the login/signup forms to the backend JWT authentication.

### 3. Chat & Code Modules
**Current:** Working streaming UI using `gemini-1.5-flash`.
**Target:** Persisted conversation history, ability to rename/delete chats.
**Action:**
* **Extend:** Wire up the UI to load past conversations from the backend and save new ones.

### 4. Image & Video Modules
**Current:** UI exists. Prompts are enhanced by Gemini, but image generation returns placeholders. Video generation streams a script but doesn't generate actual video.
**Target:** Functional prompt engineering workflows. If actual media generation APIs (DALL-E/Runway) are unavailable, the architecture must handle prompt generation, storyboarding, and mock the final asset correctly so it's ready for future integration.
**Action:**
* **Keep:** Current prompt enhancement and storyboard generation logic.
* **Extend:** Save generated scripts/prompts as `generated_output` in the backend so users can access their history.

### 5. Workspace Organization
**Current:** Database schema exists. UI is missing.
**Target:** Users can create workspaces, switch between them, and see associated conversations/outputs.
**Action:**
* **Build:** The Workspace dashboard and navigation context.

---

## Final Checklist of Missing Pieces to Build:
1. Delete/Disable legacy CMS content types to clean the backend.
2. Create `tool_run` and `generated_output` content types.
3. Integrate Frontend Auth with Backend JWT.
4. Build the `/workspaces` frontend page.
5. Build the `/prompts` frontend page.
6. Connect Chat/Code Next.js API routes to save messages asynchronously to the backend.
7. Connect Image/Video modules to save outputs to the backend.
