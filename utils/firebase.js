const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, setDoc } = require("firebase/firestore");

const firebaseConfig = require("./firebaseConfig");

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Collection name for members data
const MEMBERS_COLLECTION = "matchyData";
const MEMBERS_DOC_ID = "members";

// Load members data from Firestore
const loadMembersData = async () => {
  try {
    const docRef = doc(db, MEMBERS_COLLECTION, MEMBERS_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawOverrides = Array.isArray(data.nextMatchOverrides) ? data.nextMatchOverrides : [];
      const parsedOverrides = rawOverrides
        .map(group => {
          if (Array.isArray(group?.members)) return group.members;
          if (Array.isArray(group)) return group;
          return [];
        })
        .filter(group => Array.isArray(group) && group.length > 0);

      return {
        members: data.members || [],
        previousMatches: data.previousMatches || {},
        nextMatchOverrides: parsedOverrides,
        skipNextMatchy: Boolean(data.skipNextMatchy),
      };
    } else {
      // Document doesn't exist, initialize it with empty structure
      console.log("Members document doesn't exist, initializing with empty structure");
      const emptyData = { members: [], previousMatches: {}, nextMatchOverrides: [], skipNextMatchy: false };
      
      // Create the document in Firestore
      try {
        await setDoc(docRef, {
          ...emptyData,
          lastUpdated: new Date().toISOString()
        });
        console.log("Successfully initialized members document in Firestore");
      } catch (error) {
        console.error("Error initializing members document:", error);
        // Continue anyway and return empty data
      }
      
      return emptyData;
    }
  } catch (error) {
    console.error("Error loading members data from Firestore:", error);
    return { members: [], previousMatches: {}, nextMatchOverrides: [], skipNextMatchy: false };
  }
};

// Save members data to Firestore
const saveMembersData = async (data) => {
  try {
    const docRef = doc(db, MEMBERS_COLLECTION, MEMBERS_DOC_ID);
    const sanitizedOverrides = Array.isArray(data.nextMatchOverrides)
      ? data.nextMatchOverrides
          .map(group => {
            if (Array.isArray(group)) {
              return { members: group.filter(Boolean) };
            }
            if (Array.isArray(group?.members)) {
              return { members: group.members.filter(Boolean) };
            }
            return null;
          })
          .filter(group => group && group.members.length > 0)
      : [];

    await setDoc(docRef, {
      members: data.members || [],
      previousMatches: data.previousMatches || {},
      nextMatchOverrides: sanitizedOverrides,
      skipNextMatchy: Boolean(data.skipNextMatchy),
      lastUpdated: new Date().toISOString()
    }, { merge: false }); // Overwrite entire document
    
    console.log("Successfully saved members data to Firestore");
  } catch (error) {
    console.error("Error saving members data to Firestore:", error);
    throw error;
  }
};

module.exports = {
  db,
  loadMembersData,
  saveMembersData
};

