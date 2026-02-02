require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const firebaseConfig = require("../utils/firebaseConfig");

let credential = null;
const explicitKeyPath = process.env.FIREBASE_PATH;

const loadServiceAccountFromPath = (keyPath) => {
  const resolvedPath = path.isAbsolute(keyPath)
    ? keyPath
    : path.join(process.cwd(), keyPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Service account file not found at ${resolvedPath}`);
  }
  const fileContents = fs.readFileSync(resolvedPath, "utf8");
  return JSON.parse(fileContents);
};

if (explicitKeyPath) {
  try {
    const serviceAccount = loadServiceAccountFromPath(explicitKeyPath);
    credential = admin.credential.cert(serviceAccount);
  } catch (error) {
    console.error("Failed to load service account from FIREBASE_SERVICE_ACCOUNT:", error);
    process.exit(1);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    credential = admin.credential.applicationDefault();
  } catch (error) {
    console.error("Failed to load default credentials:", error);
    process.exit(1);
  }
} else {
  const fallbackPath = path.join(process.cwd(), "serviceAccountKey.json");
  if (fs.existsSync(fallbackPath)) {
    try {
      const serviceAccount = loadServiceAccountFromPath(fallbackPath);
      credential = admin.credential.cert(serviceAccount);
    } catch (error) {
      console.error("Failed to load serviceAccountKey.json:", error);
      process.exit(1);
    }
  } else {
    console.error(
      "No credentials found. Set FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, or provide serviceAccountKey.json."
    );
    process.exit(1);
  }
}

if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential,
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK.", error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function exportFirestore() {
  try {
    const exportData = {};
    const collections = await db.listCollections();

    for (const collection of collections) {
      const snapshot = await collection.get();
      exportData[collection.id] = {};

      snapshot.forEach((doc) => {
        exportData[collection.id][doc.id] = doc.data();
      });
    }

    const outputDir = path.join(process.cwd(), "exports");
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(outputDir, `firestore-export-${timestamp}.json`);

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Firestore export complete: ${filePath}`);
  } catch (error) {
    console.error("❌ Error exporting Firestore:", error);
    process.exit(1);
  }
}

exportFirestore();

