# 🛡️ Cloudflare Zero Trust (Access) Setup Guide for DefenceWire

This document outlines the **5-minute step-by-step guide** to configure **Cloudflare Zero Trust (Access)** for the DefenceWire Curator Portal.

---

## 🌟 Why Cloudflare Zero Trust?

- **100% Free** on Cloudflare for up to 50 users.
- **Enterprise-Grade Identity**: Enforces Google Workspace, GitHub SSO, or Email One-Time PIN with 2FA/TOTP or Hardware Security Keys (YubiKey/TouchID).
- **Zero Client Passwords**: Attackers cannot brute-force password modals or scrape client bundles.
- **Cryptographic Audit Trail**: Every story promotion, demotion, headline change, or SSB brief is stamped with the verified curator's email in the Cloudflare D1 database.

---

## 🚀 5-Minute Setup Steps

### Step 1: Open Cloudflare Zero Trust Dashboard
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation sidebar, click on **Zero Trust**.
3. (If this is your first time, pick a free team name e.g., `defencewire-team`).

---

### Step 2: Configure Authentication Method (IdP)
1. In the Zero Trust sidebar, navigate to **Settings** → **Authentication**.
2. Under **Login methods**, choose your preferred identity provider:
   - **One-time PIN (Email)**: Sends a secure 6-digit code to your email.
   - **Google / Google Workspace**: Single Sign-On with your Google account.
   - **GitHub**: Single Sign-On with your GitHub account.

---

### Step 3: Create an Access Application
1. In the Zero Trust sidebar, navigate to **Access** → **Applications**.
2. Click **Add an Application** → Select **Self-Hosted**.
3. Fill in the **Application Configuration**:
   - **Application name**: `DefenceWire Curator Desk`
   - **Session Duration**: `24 hours` (or your preference)
   - **Application domain**:
     - Subdomain / Path: `defencewire.in` / `api/curator/*`
     - *(Optional: Add another rule for the front-end curator route if applicable)*
4. Click **Next**.

---

### Step 4: Define Access Policy (Who is allowed)
1. Set **Policy name**: `Allow Institutional Curators`
2. **Action**: `Allow`
3. Under **Configure rules** → **Include**:
   - **Selector**: `Emails`
   - **Value**: Enter your authorized curator email address(es), e.g.:
     `your-email@gmail.com` or `editor@defencewire.in`
4. Click **Next** → Click **Save Application**.

---

## 🔒 Verification

1. When you access the Curator Desk or perform a curator action, Cloudflare will display your branded Zero Trust SSO / 2FA login screen.
2. Once authenticated, the Curator Desk will display:
   `🎯 Editorial Curation Control [🛡️ Zero Trust Verified: your-email@...]`
3. Every override saved will write directly to Cloudflare D1 with your email in the `curator_email` audit column!
