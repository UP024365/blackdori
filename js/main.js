import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

console.log("main.js SPA(단일 페이지) 버전 로드됨! ✨");

// 1. 관리자 설정 (본인 이메일로 수정하세요)
const ADMINS = ["종윤님이메일@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 인증 상태 감지 (새로고침 없이 UI를 자동으로 업데이트합니다)
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
        // 새로고침 없이 입력창만 숨기고 버튼 텍스트를 바꿉니다.
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
    }
});

// 3. 로그인/로그아웃 버튼 동작
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) {
            // signOut만 호출해도 onAuthStateChanged가 감지해서 UI를 바꿔줍니다.
            await signOut(auth);
        }
    } else {
        try {
            // 팝업 방식을 사용하여 페이지 이동 없이 로그인을 진행합니다.
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("인증 에러:", error);
            alert("로그인 중 오류가 발생했습니다.");
        }
    }
};

// 4. 데이터 저장 (저장 후에도 페이지는 그대로 유지됩니다)
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
        
        // 입력 칸만 비워줍니다.
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 실패:", e);
        alert("저장 권한이 없습니다.");
    }
});

// 5. 실시간 리스트 출력 (데이터가 변하면 자동으로 표만 업데이트됩니다)
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