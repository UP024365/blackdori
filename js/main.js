import { db, auth } from './firebase-config.js'; //
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 관리자 이메일 설정 (반드시 본인 이메일을 소문자로 입력하세요)
const ADMINS = ["본인의이메일@gmail.com"]; 
const provider = new GoogleAuthProvider();

const customerList = document.getElementById('customerList'); //
const addBtn = document.getElementById('addBtn'); //
const authBtn = document.getElementById('authBtn'); //
const inputSection = document.querySelector('.input-section'); //

// 2. 인증 상태 감지 (가장 안정적인 방식)
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userEmail = user.email.toLowerCase();
        console.log("로그인 성공 계정:", userEmail);

        if (ADMINS.includes(userEmail)) {
            console.log("✅ 관리자 확인됨");
            if (inputSection) inputSection.style.display = "grid"; 
            authBtn.innerText = "로그아웃";
        } else {
            console.warn("⚠️ 관리자 권한 없음");
            // 튕김 방지: signOut()을 호출하지 않고 UI만 숨깁니다.
            if (inputSection) inputSection.style.display = "none";
            authBtn.innerText = "로그아웃 (일반사용자)";
            alert("관리자 목록에 등록되지 않은 이메일입니다.");
        }
    } else {
        console.log("ℹ️ 로그아웃 상태");
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
    }
});

// 3. 로그인/로그아웃 동작 (팝업 방식 고정)
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
        }
    } else {
        try {
            // 404 에러를 유발하는 리다이렉트 대신 팝업만 사용
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("로그인 에러:", error);
            alert("로그인 중 오류가 발생했습니다. (승인된 도메인 확인 필요)");
        }
    }
};

// 4. 데이터 저장 로직
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) {
        alert("내용을 입력해주세요! 🦎");
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
        alert("데이터베이스 저장 권한이 없습니다.");
    }
});

// 5. 리스트 출력 (실시간)
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