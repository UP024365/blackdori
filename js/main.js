import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

console.log("main.js 안정화 버전 로드됨! 🚀");

// 1. 관리자 설정 (반드시 소문자로 작성)
const ADMINS = ["pmr08042002com@gmail.com", "친구이메일@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 리다이렉트 로그인 결과 처리 (한 번만 실행되도록 설정)
async function handleRedirect() {
    try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
            console.log("리다이렉트 로그인 성공:", result.user.email);
        }
    } catch (error) {
        if (error.code !== 'auth/invalid-pending-token') {
            console.error("인증 처리 중 오류:", error.message);
        }
    }
}
handleRedirect();

// 3. 인증 상태 감지 (가장 중요한 부분)
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userEmail = user.email.toLowerCase();
        console.log("로그인 계정:", userEmail);

        if (ADMINS.includes(userEmail)) {
            console.log("✅ 관리자 권한 확인됨");
            if (inputSection) inputSection.style.display = "grid"; 
            authBtn.innerText = "로그아웃";
        } else {
            console.warn("⚠️ 권한 없는 사용자");
            alert("관리자 권한이 없습니다.");
            signOut(auth);
        }
    } else {
        console.log("ℹ️ 비로그인 상태");
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
    }
});

// 4. 로그인/로그아웃 버튼 동작
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            location.href = location.origin + location.pathname; // 깔끔하게 첫 화면으로 이동
        }
    } else {
        // 팝업 대신 리다이렉트 사용 (COOP 에러 방지)
        signInWithRedirect(auth, provider);
    }
};

// 5. 데이터 저장
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) {
        alert("이름과 종류를 입력하세요! 🦎");
        return;
    }

    try {
        await addDoc(collection(db, "customers"), {
            name, type, grade,
            timestamp: serverTimestamp(),
            manager: auth.currentUser.email
        });
        alert("등록 완료!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 실패:", e);
        alert("저장 권한이 없습니다.");
    }
});

// 6. 실시간 리스트 출력
const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    if (customerList) {
        customerList.innerHTML = "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "방금 전";
            const row = `
                <tr>
                    <td>${data.name}</td>
                    <td>${data.type}</td>
                    <td><span class="grade-${data.grade}">${data.grade}</span></td>
                    <td>${date}</td>
                </tr>
            `;
            customerList.insertAdjacentHTML('beforeend', row);
        });
    }
});