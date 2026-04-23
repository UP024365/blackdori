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
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

console.log("main.js 파일이 성공적으로 로드되었습니다! 🚀");

// 1. 관리자 설정 (종윤님과 친구분 이메일 입력)
const ADMINS = ["종윤님계정@gmail.com", "친구계정@gmail.com"]; 
const provider = new GoogleAuthProvider();

// HTML 요소 가져오기
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 관리자 로그인/로그아웃 로직
authBtn.onclick = async () => {
    if (auth.currentUser) {
        await signOut(auth);
        alert("로그아웃 되었습니다.");
    } else {
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error("로그인 실패:", e);
        }
    }
};

// 3. 인증 상태 감지 (관리자 확인 및 UI 제어)
onAuthStateChanged(auth, (user) => {
    if (user && ADMINS.includes(user.email)) {
        console.log("관리자 접속 확인 🦎");
        if (inputSection) inputSection.style.display = "grid"; 
        authBtn.innerText = "로그아웃";
    } else {
        console.log("일반 방문자 모드");
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
        if (user && !ADMINS.includes(user.email)) {
            alert("관리자 권한이 없는 계정입니다.");
        }
    }
});

// 4. 데이터 저장 (관리자만 가능)
addBtn.addEventListener('click', async () => {
    console.log("등록 버튼 클릭됨");
    
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
            manager: auth.currentUser.email // 누가 등록했는지 기록
        });
        alert("저장 완료!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 오류:", e);
        alert("권한이 없거나 오류가 발생했습니다.");
    }
});

// 5. 데이터 실시간 불러오기
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