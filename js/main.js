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

// 1. 관리자 설정 (실제 구글 이메일 주소로 정확히 수정하세요)
const ADMINS = ["종윤님계정@gmail.com", "친구계정@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소 가져오기
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 리다이렉트 로그인 결과 처리 (페이지 로드 시 자동 실행)
getRedirectResult(auth)
    .then((result) => {
        if (result?.user) {
            console.log("로그인 성공:", result.user.email);
        }
    })
    .catch((error) => {
        console.error("인증 처리 중 오류 발생:", error);
    });

// 3. 로그인/로그아웃 버튼 클릭 이벤트
authBtn.onclick = async () => {
    if (auth.currentUser) {
        // 이미 로그인된 상태면 로그아웃
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            alert("로그아웃 되었습니다.");
            location.reload(); // UI 초기화를 위해 새로고침
        }
    } else {
        // 리다이렉트 방식 로그인 (팝업 차단 및 COOP 에러 방지)
        try {
            await signInWithRedirect(auth, provider);
        } catch (e) {
            console.error("로그인 시도 중 오류:", e);
            alert("로그인 페이지로 이동하는 데 실패했습니다.");
        }
    }
};

// 4. 인증 상태 감지 (관리자 체크 및 UI 제어)
onAuthStateChanged(auth, (user) => {
    if (user && ADMINS.includes(user.email)) {
        console.log("✅ 관리자 접속 확인:", user.email);
        // 관리자면 입력창을 보여줌 (style.css에서 기본 display: none 설정 권장)
        if (inputSection) inputSection.style.display = "grid"; 
        authBtn.innerText = "로그아웃";
    } else {
        console.log("ℹ️ 일반 방문자 모드");
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
        
        // 로그인했지만 관리자가 아닌 경우 알림 후 로그아웃 처리 (선택 사항)
        if (user && !ADMINS.includes(user.email)) {
            alert("관리자 권한이 없는 계정입니다.");
            signOut(auth);
        }
    }
});

// 5. 데이터 저장 로직 (관리자만 가능)
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
            name: name,
            type: type,
            grade: grade,
            timestamp: serverTimestamp(),
            manager: auth.currentUser ? auth.currentUser.email : "unknown"
        });
        alert("성공적으로 등록되었습니다!");
        
        // 입력창 비우기
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 중 오류 발생:", e);
        alert("저장 권한이 없거나 오류가 발생했습니다. (Firestore Rules 확인 필요)");
    }
});

// 6. 데이터 실시간 불러오기 및 리스트 표시
const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    if (customerList) {
        customerList.innerHTML = ""; // 기존 리스트 초기화
        
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