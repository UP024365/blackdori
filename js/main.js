import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
    doc, deleteDoc, updateDoc // 수정/삭제를 위해 추가
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 관리자 설정
const ADMINS = ["pmr08042002com@gmail.com", "gkwit123y@gmail.com"]; 
const provider = new GoogleAuthProvider();
let editingId = null; // 현재 수정 중인 문서의 ID를 저장

// HTML 요소
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const inputSection = document.querySelector('.input-section');

// 2. 인증 상태 감지
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userEmail = user.email.toLowerCase();
        if (ADMINS.includes(userEmail)) {
            if (inputSection) inputSection.style.display = "grid"; 
            authBtn.innerText = "로그아웃";
        } else {
            alert("관리자 권한이 없습니다.");
            signOut(auth);
        }
    } else {
        if (inputSection) inputSection.style.display = "none";
        authBtn.innerText = "관리자 로그인";
    }
});

// 3. 로그인/로그아웃
authBtn.onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) await signOut(auth);
    } else {
        try { await signInWithPopup(auth, provider); } 
        catch (e) { alert("로그인 실패: " + e.message); }
    }
};

// 4. 데이터 저장 및 수정
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) return alert("내용을 입력하세요! 🦎");

    try {
        if (editingId) {
            // 수정 모드일 때
            await updateDoc(doc(db, "customers", editingId), {
                name, type, grade
            });
            alert("수정 완료!");
            editingId = null;
            addBtn.innerText = "신규 등록";
        } else {
            // 신규 등록 모드일 때
            await addDoc(collection(db, "customers"), {
                name, type, grade,
                timestamp: serverTimestamp(),
                manager: auth.currentUser.email
            });
            alert("등록 완료!");
        }
        // 입력창 초기화
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        alert("권한이 없습니다.");
    }
});

// 5. 삭제 및 수정 버튼 기능 (전역 함수로 등록)
window.deleteCustomer = async (id) => {
    if (confirm("정말로 삭제하시겠습니까? 🚮")) {
        try {
            await deleteDoc(doc(db, "customers", id));
            alert("삭제되었습니다.");
        } catch (e) { alert("삭제 권한이 없습니다."); }
    }
};

window.startEdit = (id, name, type, grade) => {
    editingId = id;
    document.getElementById('custName').value = name;
    document.getElementById('lizardType').value = type;
    document.getElementById('custGrade').value = grade;
    addBtn.innerText = "수정 하기";
    window.scrollTo(0, 0); // 입력창으로 스크롤 이동
};

// 6. 실시간 리스트 출력 (수정/삭제 버튼 포함)
const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    if (customerList) {
        customerList.innerHTML = "";
        snapshot.forEach((customerDoc) => {
            const data = customerDoc.data();
            const id = customerDoc.id;
            const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "방금 전";
            
            const row = `
                <tr>
                    <td>${data.name}</td>
                    <td>${data.type}</td>
                    <td><span class="grade-${data.grade}">${data.grade}</span></td>
                    <td>${date}</td>
                    <td>
                        <button onclick="startEdit('${id}', '${data.name}', '${data.type}', '${data.grade}')" style="cursor:pointer; border:none; background:#3498db; color:white; border-radius:4px; padding:3px 8px;">수정</button>
                        <button onclick="deleteCustomer('${id}')" style="cursor:pointer; border:none; background:#e74c3c; color:white; border-radius:4px; padding:3px 8px;">삭제</button>
                    </td>
                </tr>
            `;
            customerList.insertAdjacentHTML('beforeend', row);
        });
    }
});