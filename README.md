# BlenderBin.com
Next.js app for BlenderBin.com



To create a Next.js app optimized for deployment on Vercel, follow these steps:

---

### **1. Install Node.js and npm**
Ensure you have Node.js installed on your machine. You can download it from [Node.js](https://nodejs.org/).

Verify installation:
```bash
node -v
npm -v
```

---

### **2. Create a New Next.js App**
Run the following command to create a new Next.js app:
```bash
npx create-next-app@latest my-nextjs-app
```

You'll be prompted to choose various configurations. For Vercel deployment, you can accept the default options or customize as needed:
- TypeScript: Recommended (`Yes`) if you're familiar with it.
- ESLint: Optional but recommended for linting.
- Tailwind CSS: Optional for styling.
- `src/` directory: Optional based on your preference.
- App Router: Recommended for new projects (Next.js 13+ feature).
- Import aliases: Optional for custom path imports.

Move into the newly created app folder:
```bash
cd my-nextjs-app
```

---

### **3. Test the Development Server**
Run the development server to ensure the app works:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view your app.

---

### **4. Prepare for Vercel Deployment**
Create a `.vercelignore` file (optional) to exclude unnecessary files from deployment:
```bash
touch .vercelignore
```
Example contents:
```
node_modules
.env.local
```

Ensure your `package.json` includes the necessary build and start scripts (created automatically by `create-next-app`):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

---

### **5. Initialize Git**
If not already initialized:
```bash
git init
git add .
git commit -m "Initial commit"
```

---

### **6. Deploy to Vercel**
Install the Vercel CLI:
```bash
npm install -g vercel
```

Run the following command to deploy:
```bash
vercel
```

During the deployment process, you’ll be prompted to:
1. Connect to your Vercel account (log in if necessary).
2. Select or create a new project.
3. Set project configurations (use defaults for most settings).

---

### **7. Update Environment Variables (if any)**
If your app uses environment variables, add them in the Vercel dashboard or via the CLI:
```bash
vercel env add <key>
```

For local development, use a `.env.local` file:
```bash
touch .env.local
```

Example:
```bash
NEXT_PUBLIC_API_URL=https://api.example.com
```

---

### **8. Build and Verify**
Build your app locally to test for production readiness:
```bash
npm run build
```

---

### **9. Access Your Deployed App**
Vercel will provide a deployment URL. Visit the URL to see your deployed app.

For future updates, push changes to the linked Git repository. Vercel will automatically trigger deployments.