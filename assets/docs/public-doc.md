# 🎧 Music Moodboard – Generative AI + Spotify

### 🚀 Project Overview

**Music Moodboard** is a **generative, multimodal AI application** that uses Spotify APIs and Auth0 for secure, role-based access.
The app allows users to translate *moods, activities, or creative ideas* into dynamic, personalized playlists.

Users describe a feeling or upload an image — the AI interprets the emotional tone and creates a custom Spotify playlist using the Spotify Web API.

---

## 🎯 Problem Statement

Music is emotional, but existing playlist tools are static.
Users struggle to express nuanced creative moods — such as *“music for walking in Tokyo at midnight”* — in a way that existing systems can understand.

**Challenge:** How can we let people generate playlists that match their *vibe*, *emotion*, or *creative concept* — safely and securely?

---

## 💡 Solution

Music Moodboard uses an **agentic AI system** to:

* Understand mood prompts or images.
* Extract emotional and aesthetic cues (tempo, energy, valence).
* Call Spotify APIs (`Recommendations`, `Audio Features`, `Search`, `Create Playlist`) to generate playlists that match that emotion.
* Securely authenticate users and control API access through **Auth0 for AI Agents**.

The system has two types of users:

* 🎧 **Normal Users** — general users who can use basic features and access public content.
* 🧑‍💻 **Developers** — users who can also access integration guides, developer terms, and advanced playlist tools.

---

## 🧩 Architecture Overview

### Core Components

1. **Auth0 for AI Agents**

   * Authenticates users securely.
   * Manages Spotify API tokens through the **Token Vault**.
   * Applies *fine-grained authorization* to control which knowledge (documents) the AI can access.

2. **Spotify Web API**

   * `Search`: Finds seed tracks/artists.
   * `Recommendations`: Generates playlists using mood-based parameters.
   * `Audio Features`: Extracts tempo, valence, and energy for fine-tuning.
   * `Create Playlist`: Saves the generated playlist to the user’s account.

3. **AI Agent**

   * Interprets text prompts and images.
   * Maps mood → audio features.
   * Iteratively refines playlists using user feedback (“more jazzy”, “less electronic”).

4. **Knowledge Tiering**

   * Public Knowledge → Accessible by all users (Terms, Privacy Policy, basic Spotify docs)
   * Developer Knowledge → Only available to authenticated developers (Integration Guide, Developer Terms)

---

## 🔐 Auth0 Integration

### 1. **Authenticate the User**

* Auth0 login secures both Normal and Developer users.
* JWT contains user role:

  ```json
  {
    "sub": "user_001",
    "role": "developer",
    "scope": ["read:public_docs", "read:dev_docs"]
  }
  ```

### 2. **Control the Tools**

* Spotify access tokens stored in Auth0 Token Vault.
* Agent never stores Spotify credentials directly.

### 3. **Limit the Knowledge**

Two document tiers (used by the RAG pipeline):

* `public_docs/terms_privacy.md` → accessible to all users.
* `developer_docs/dev_terms_integration.md` → accessible only to developers.

Agent checks access level before retrieving context:

```ts
if (user.role === "developer") {
  context += load("developer_docs/dev_terms_integration.md");
}
context += load("public_docs/terms_privacy.md");
```

---

## 🧠 Agent Workflow

1. User input → text or image describing a mood.
2. AI extracts emotional cues (energy, tempo, valence).
3. Agent generates query parameters for Spotify’s `Recommendations` API.
4. Agent creates playlist via `Create Playlist` API.
5. AI iterates with feedback.
6. Access control check:

   * Normal users can only reference `public_docs`.
   * Developers can additionally reference `developer_docs` (integration or API management guidance).

---

## 🧰 Example Use Flow

**User:** “Make me music for a late-night train ride.”

* AI interprets “late-night” → low energy, high acousticness.
* Spotify Recommendations API generates ambient, lo-fi, or chill tracks.
* Playlist saved to user’s Spotify account.

**Developer:** “Create a playlist and show me the integration steps for connecting it to my app.”

* AI accesses both mood data + developer docs.
* Generates playlist + provides API integration guide steps.

---

## ⚙️ Tech Stack

| Component           | Technology                              |
| ------------------- | --------------------------------------- |
| Authentication      | Auth0 for AI Agents                     |
| AI Framework        | OpenAI API / LlamaIndex                 |
| Backend             | Next.js / Node.js                       |
| Data Access Control | Auth0 Fine-Grained Authorization (FGA)  |
| Music API           | Spotify Web API                         |
| Storage             | Token Vault + RAG with document tiering |
| Deployment          | Vercel / Netlify                        |

---

## 🔒 Security Highlights

* **Auth0 for AI Agents** secures every stage:

  * User login (human authentication)
  * Tool access (Spotify API token control)
  * Knowledge limitation (FGA & role-based RAG)
* **Data Privacy:** Only authorized users access private docs.
* **Scoped API Tokens:** Tokens expire automatically after short lifespans.
* **No Persistent Secrets:** All API credentials are managed by Auth0 Token Vault.

---

## 🧩 Role-Based Document Access

| User Type   | Accessible Docs                                | Access Level         |
| ----------- | ---------------------------------------------- | -------------------- |
| Normal User | `terms_privacy.md`                             | Public               |
| Developer   | `terms_privacy.md`, `dev_terms_integration.md` | Private / Restricted |

---

# 📜 Terms and Conditions

### 1. Introduction

Welcome to **Music Moodboard**, an AI-powered application that creates personalized playlists using Spotify APIs.
By using this service, you agree to comply with these Terms and Conditions.

### 2. User Roles

* **Normal Users** may use the service for personal playlist creation.
* **Developers** may integrate Music Moodboard features into other applications following the Developer Terms.

### 3. Usage

Users agree to:

* Provide accurate information during authentication.
* Not misuse the Spotify API or violate Spotify’s Developer Terms of Service.
* Acknowledge that Music Moodboard uses AI models that may generate approximate results.

### 4. Access Control

* Public documents are available to all users.
* Developer-only documents and APIs require Auth0-authenticated access.

### 5. Intellectual Property

All AI-generated playlists are user-owned.
Underlying algorithms, models, and content libraries remain the property of the Music Moodboard team.

### 6. Limitation of Liability

Music Moodboard and its affiliates are not liable for any indirect damages arising from the use of AI-generated content or integration errors.

### 7. Modifications

Music Moodboard reserves the right to modify these Terms at any time, with notice posted within the application.

---

# 🔐 Privacy Policy

### 1. Data Collection

We collect:

* Authentication details via Auth0 (email, role)
* Usage data (prompt text, feedback)
* Spotify connection data (only tokens via Token Vault; never raw credentials)

### 2. Data Usage

Data is used to:

* Generate personalized playlists
* Improve mood interpretation accuracy
* Provide developer integrations (for developer users only)

### 3. Data Sharing

We do **not** share user data with third parties, except Spotify for playlist creation under user authorization.

### 4. Data Security

* All credentials are managed by Auth0.
* Tokens are encrypted and stored only temporarily.
* Role-based access prevents data leakage between user tiers.

### 5. User Rights

You can request deletion of your data, revoke Spotify access, or downgrade your role from Developer to Normal User at any time.

### 6. Contact

For privacy or data-related queries, contact:
📧 **[support@musicmoodboard.ai](mailto:support@musicmoodboard.ai)**

---

## 🏁 Summary

| Feature           | Implementation                               | Benefit                    |
| ----------------- | -------------------------------------------- | -------------------------- |
| Authenticate User | Auth0 login                                  | Secure user access         |
| Control Tools     | Spotify Token Vault                          | Scoped API access          |
| Limit Knowledge   | Role-based doc tiering (public vs developer) | Fine-grained authorization |
| Privacy + Terms   | Included in same document                    | Complete compliance        |
