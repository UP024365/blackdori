import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
// 필수: 로그인 기능을 위한 라이브러리 추가
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

console.log("main.js 파일이 성공적으로 로드되었습니다! 🚀");

// 1. 관리자 이메일 설정 (실제 이메일로 수정하세요)
const ADMINS = ["종윤님계정@gmail.com", "친구계정@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소 가져오기
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 로그인/로그아웃 버튼 작동 로직
authBtn.onclick = async () => {
    if (auth.currentUser) {
        // 이미 로그인된 상태면 로그아웃
        await signOut(auth);
        alert("로그아웃 되었습니다.");
    } else {
        // 로그아웃 상태면 구글 로그인 팝업 실행
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error("로그인 중 오류 발생:", e);
            alert("로그인에 실패했습니다.");
        }
    }
};

// 3. 인증 상태 감지 (관리자 체크 및 UI 제어)
onAuthStateChanged(auth, (user) => {
    if (user && ADMINS.includes(user.email)) {
        console.log("관리자 접속 확인: ", user.email);
        if (inputSection) inputSection.style.display = "grid"; // 관리자면 입력창 보임
        authBtn.innerText = "로그아웃";
    } else {
        console.log("일반 방문자 모드");
        if (inputSection) inputSection.style.display = "none"; // 일반인이면 입력창 숨김
        authBtn.innerText = "관리자 로그인";
        
        if (user && !ADMINS.includes(user.email)) {
            alert("관리자 권한이 없는 계정입니다.");
            signOut(auth);
        }
    }
});

// 4. 데이터 저장 로직 (등록 버튼)
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
            manager: auth.currentUser.email
        });
        alert("저장 완료!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 오류:", e);
        alert("권한이 없거나 저장에 실패했습니다.");
    }
});

// 5. 실시간 리스트 출력
const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
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
});