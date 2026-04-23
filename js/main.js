import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

console.log("main.js 파일 로드 성공! 🚀");

// 1. 관리자 설정 (반드시 소문자로 입력)
const ADMINS = ["종윤님계정@gmail.com", "친구계정@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 로그인/로그아웃 버튼 로직
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            alert("로그아웃 되었습니다.");
            // 로그아웃 시에만 수동으로 페이지 갱신
            location.reload();
        }
    } else {
        try {
            // 팝업 에러 우회를 위해 리다이렉트 방식 유지
            await signInWithRedirect(auth, provider);
        } catch (e) {
            console.error("로그인 시도 중 오류:", e);
        }
    }
};

// 3. 인증 상태 감지 (핵심: 여기가 안정적이어야 관리자 모드가 유지됨)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("현재 로그인한 계정:", user.email);
        
        if (ADMINS.includes(user.email.toLowerCase())) {
            console.log("✅ 관리자 권한 확인 완료");
            if (inputSection) inputSection.style.display = "grid"; 
            authBtn.innerText = "로그아웃";
        } else {
            console.log("ℹ️ 권한 없는 계정입니다.");
            alert("관리자 권한이 없습니다.");
            signOut(auth);
            if (inputSection) inputSection.style.display = "none";
            authBtn.innerText = "관리자 로그인";
        }
    } else {
        console.log("ℹ️ 미로그인 상태 (방문자 모드)");
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
    }
});

// 4. 데이터 저장 로직
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) {
        alert("이름과 종류를 모두 입력해주세요! 🦎");
        return;
    }

    try {
        await addDoc(collection(db, "customers"), {
            name: name, type: type, grade: grade,
            timestamp: serverTimestamp(),
            manager: auth.currentUser.email
        });
        alert("저장 완료!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 실패:", e);
        alert("저장 권한이 없습니다.");
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