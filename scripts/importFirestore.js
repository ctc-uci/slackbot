require("dotenv").config("../");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const firebaseConfig = require("../utils/firebaseConfig");

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

let credential = null;

const explicitKeyPath = process.env.FIREBASE_PATH;
if (explicitKeyPath) {
  const serviceAccount = loadServiceAccountFromPath(explicitKeyPath);
  credential = admin.credential.cert(serviceAccount);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = admin.credential.applicationDefault();
} else {
  const fallbackPath = path.join(process.cwd(), "serviceAccountKey.json");
  if (!fs.existsSync(fallbackPath)) {
    console.error(
      "No credentials found. Set FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, or provide serviceAccountKey.json."
    );
    process.exit(1);
  }
  const serviceAccount = loadServiceAccountFromPath(fallbackPath);
  credential = admin.credential.cert(serviceAccount);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential,
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

async function importFirestore() {
  try {
    const exportPath = process.argv[2];
    if (!exportPath) {
      console.error("❌ Usage: npm run import:firestore -- <path-to-export.json>");
      process.exit(1);
    }

    const resolvedPath = path.isAbsolute(exportPath)
      ? exportPath
      : path.join(process.cwd(), exportPath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ Export file not found at ${resolvedPath}`);
      process.exit(1);
    }

    const fileContents = fs.readFileSync(resolvedPath, "utf8");
    const exportData = JSON.parse(fileContents);

    const collectionIds = Object.keys(exportData || {});
    if (collectionIds.length === 0) {
      console.log("⚠️ Export file is empty. Nothing to import.");
      return;
    }

    for (const collectionId of collectionIds) {
      const docs = exportData[collectionId];
      if (!docs || typeof docs !== "object") continue;

      const batch = db.batch();
      const docIds = Object.keys(docs);

      docIds.forEach((docId, index) => {
        const docRef = db.collection(collectionId).doc(docId);
        batch.set(docRef, docs[docId]);

        if ((index + 1) % 400 === 0) {
          batch.commit();
        }
      });

      await batch.commit();
      console.log(`✅ Imported collection: ${collectionId}`);
    }

    console.log("🎉 Firestore import complete!");
  } catch (error) {
    console.error("❌ Error importing Firestore:", error);
    process.exit(1);
  }
}

importFirestore();

