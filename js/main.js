import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, 
    signInWithRedirect, 
    getRedirectResult, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

console.log("main.js 파일이 성공적으로 로드되었습니다! 🚀");

// 1. 관리자 설정 (종윤님과 친구분 이메일로 수정)
const ADMINS = ["종윤님이메일@gmail.com", "친구이메일@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소 가져오기
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 리다이렉트 로그인 결과 확인 (페이지가 다시 로드될 때 실행됨)
getRedirectResult(auth)
    .then((result) => {
        if (result?.user) {
            console.log("로그인 성공:", result.user.email);
        }
    })
    .catch((error) => {
        console.error("인증 처리 중 오류:", error);
    });

// 3. 로그인/로그아웃 버튼 클릭 이벤트
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            alert("로그아웃 되었습니다.");
            location.reload();
        }
    } else {
        try {
            // 팝업 에러를 피하기 위해 리다이렉트 방식 사용
            await signInWithRedirect(auth, provider);
        } catch (e) {
            console.error("로그인 시도 중 오류:", e);
        }
    }
};

// 4. 인증 상태 감지 및 UI 제어
onAuthStateChanged(auth, (user) => {
    if (user && ADMINS.includes(user.email)) {
        console.log("✅ 관리자 접속 확인:", user.email);
        if (inputSection) inputSection.style.display = "grid"; 
        authBtn.innerText = "로그아웃";
    } else {
        console.log("ℹ️ 일반 방문자 모드");
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
        
        if (user && !ADMINS.includes(user.email)) {
            alert("관리자 권한이 없는 계정입니다.");
            signOut(auth);
        }
    }
});

// 5. 데이터 저장 (기존 로직 유지)
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) {
        alert("정보를 모두 입력해주세요! 🦎");
        return;
    }

    try {
        await addDoc(collection(db, "customers"), {
            name: name,
            type: type,
            grade: grade,
            timestamp: serverTimestamp(),
            manager: auth.currentUser ? auth.currentUser.email : "unknown"
        });
        alert("저장 완료!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 오류:", e);
        alert("저장 실패! 권한을 확인하세요.");
    }
});

// 6. 실시간 데이터 표시
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