import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// 구매자 정보 추가
export const addCustomer = async (customerData) => {
    try {
        await addDoc(collection(db, "customers"), {
            ...customerData,
            createdAt: serverTimestamp()
        });
        alert("성공적으로 등록되었습니다! 🦎");
    } catch (e) {
        console.error("등록 에러:", e);
    }
};