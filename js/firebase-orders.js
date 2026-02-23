import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "taharah-ecommerce.firebaseapp.com",
    projectId: "taharah-ecommerce",
    storageBucket: "taharah-ecommerce.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseOrdersModule = {
    saveOrderToFirebase: async (orderData) => {
        try {
            const docRef = await addDoc(collection(db, "orders"), {
                ...orderData,
                createdAt: serverTimestamp()
            });
            return { success: true, orderId: docRef.id };
        } catch (error) {
            console.error("Firebase save error:", error);
            return { success: false, error: error.message };
        }
    }
};