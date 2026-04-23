import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 관리자 설정 (로그인할 이메일을 소문자로 입력)
const ADMINS = ["pmr08042002com@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소 연결
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 인증 상태 감지 (핵심 로직)
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userEmail = user.email.toLowerCase();
        console.log("현재 로그인한 계정:", userEmail);

        // 관리자 명단에 있는지 확인
        if (ADMINS.includes(userEmail)) {
            console.log("✅ 관리자 권한 확인됨");
            inputSection.style.display = "grid"; // 입력창 보이기
            authBtn.innerText = "로그아웃";
        } else {
            console.warn("⚠️ 일반 사용자 계정입니다.");
            inputSection.style.display = "none"; // 입력창 숨기기
            authBtn.innerText = "로그아웃 (권한없음)";
            alert("관리자 계정이 아닙니다. 데이터 수정이 불가능합니다.");
        }
    } else {
        console.log("ℹ️ 로그아웃 상태");
        inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
    }
});

// 3. 로그인/로그아웃 버튼 클릭 이벤트
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
        }
    } else {
        try {
            // 팝업 방식으로 로그인 시도
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("로그인 에러:", error);
            alert("로그인 창을 불러오지 못했습니다.");
        }
    }
};

// 4. 데이터 저장 로직
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) {
        alert("내용을 모두 입력해주세요! 🦎");
        return;
    }

    try {
        await addDoc(collection(db, "customers"), {
            name, type, grade,
            timestamp: serverTimestamp(),
            manager: auth.currentUser.email
        });
        alert("성공적으로 등록되었습니다!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 에러:", e);
        alert("데이터베이스 저장 권한이 없습니다.");
    }
});

// 5. 실시간 리스트 출력
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