import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function test() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.log("No config found!");
      return;
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    
    const app = initializeApp({
      projectId: firebaseConfig.projectId,
    });
    
    // Specifying databaseId in getFirestore(app, databaseId)
    // Or getFirestore(databaseId)
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    
    console.log("Reading settings/current using Admin SDK...");
    const snap = await db.collection("settings").doc("current").get();
    if (snap.exists) {
      console.log("SUCCESS! Admin SDK loaded settings:", snap.data()?.namaSekolah);
    } else {
      console.log("SUCCESS! Connected, but settings document does not exist yet.");
    }
  } catch (err: any) {
    console.error("FAILED to read with Admin SDK:", err.stack || err);
  }
}

test();
