// Firebase SDK들을 CDN 방식으로 불러옵니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";

// 종윤님의 파이어베이스 설정값입니다.
const firebaseConfig = {
  apiKey: "AIzaSyAAcMDgYJbjZVVMVZz5YNSGE8B6Ymq2Y_4",
  authDomain: "black-32d93.firebaseapp.com",
  projectId: "black-32d93",
  storageBucket: "black-32d93.firebasestorage.app",
  messagingSenderId: "450856877889",
  appId: "1:450856877889:web:1f72395b65ca3121f0abc0",
  measurementId: "G-K7X9TTX7XF"
};

// 파이어베이스 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일(auth.js, database.js 등)에서 쓸 수 있도록 내보냅니다.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

console.log("✅ Blackdori 파이어베이스 연결 성공!");