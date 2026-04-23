import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
    doc, deleteDoc, updateDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 변수 선언 및 초기화 (최상단 배치로 ReferenceError 방지)
const ADMINS = ["pmr08042002com@gmail.com", "gkwit123y@gmail.com"]; 
const provider = new GoogleAuthProvider();
let editingId = null; 
let marketChart = null; // 초기값을 null로 설정

// 2. 탭 전환 함수 (전역 등록)
window.showSection = (sectionId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        if (sectionId === 'marketSection') initChart();
    }
};

// 3. 그래프 초기화 함수
function initChart() {
    const ctx = document.getElementById('marketChart')?.getContext('2d');
    if (!ctx) return;
    
    // 기존 차트가 있으면 파괴 (메모리 누수 및 에러 방지)
    if (marketChart instanceof Chart) {
        marketChart.destroy();
    }

    marketChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['11월', '12월', '1월', '2월', '3월', '4월'],
            datasets: [{
                label: '평균 시세 (원)',
                data: [150000, 180000, 165000, 210000, 190000, 230000],
                borderColor: '#2ecc71',
                tension: 0.3
            }]
        }
    });
}

// 4. 인증 상태 감지 및 UI 제어
onAuthStateChanged(auth, (user) => {
    const authBtn = document.getElementById('authBtn');
    const inputSections = document.querySelectorAll('.input-section');
    
    if (user) {
        const email = user.email.toLowerCase();
        if (ADMINS.includes(email)) {
            inputSections.forEach(el => el.style.display = "grid");
            if (authBtn) authBtn.innerText = "로그아웃";
        } else {
            alert("관리자 권한이 없습니다.");
            signOut(auth);
        }
    } else {
        inputSections.forEach(el => el.style.display = "none");
        if (authBtn) authBtn.innerText = "관리자 로그인";
    }
});

// 5. 로그인/로그아웃 버튼
const authBtn = document.getElementById('authBtn');
if (authBtn) {
    authBtn.onclick = async () => {
        if (auth.currentUser) {
            if (confirm("로그아웃 하시겠습니까?")) await signOut(auth);
        } else {
            try { await signInWithPopup(auth, provider); } 
            catch (e) { console.error(e); }
        }
    };
}

// 6. 구매자 등록 (TypeError 방지용 안전 장치)
const addBuyerBtn = document.getElementById('addBuyerBtn');
if (addBuyerBtn) {
    addBuyerBtn.addEventListener('click', async () => {
        const name = document.getElementById('custName')?.value;
        const grade = document.getElementById('custGrade')?.value;
        const contact = document.getElementById('custContact')?.value || "";

        if (!name) return alert("성함을 입력하세요! 🦎");

        try {
            if (editingId) {
                await updateDoc(doc(db, "customers", editingId), { name, grade, contact });
                alert("수정 완료!");
                editingId = null;
                addBuyerBtn.innerText = "구매자 등록";
            } else {
                await addDoc(collection(db, "customers"), {
                    name, grade, contact,
                    timestamp: serverTimestamp(),
                    manager: auth.currentUser.email
                });
                alert("등록 성공!");
            }
            document.getElementById('custName').value = "";
            if (document.getElementById('custContact')) document.getElementById('custContact').value = "";
        } catch (e) { alert("저장 실패!"); }
    });
}

// 7. 도마뱀 개체 등록
const addLizardBtn = document.getElementById('addLizardBtn');
if (addLizardBtn) {
    addLizardBtn.onclick = async () => {
        const morph = document.getElementById('morph')?.value;
        const fId = document.getElementById('fatherId')?.value || "0";
        const mId = document.getElementById('motherId')?.value || "0";
        const owner = document.getElementById('buyerSelect')?.value;

        if (!morph) return alert("모프를 입력하세요!");

        try {
            const snapshot = await getDocs(collection(db, "lizards"));
            const nextId = snapshot.size + 1;
            const fullCode = `2026${morph} ${nextId}/${fId}/${mId}`;

            await addDoc(collection(db, "lizards"), {
                code: fullCode, morph, parents: { father: fId, mother: mId },
                owner, timestamp: serverTimestamp()
            });
            alert("개체 등록 완료: " + fullCode);
            document.getElementById('morph').value = "";
        } catch (e) { alert("등록 실패!"); }
    };
}

// 8. 데이터 리스트 및 삭제/수정 함수 (생략 없이 기존 로직 유지)
window.deleteData = async (col, id) => {
    if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, col, id));
};

window.startEdit = (id, name, grade) => {
    editingId = id;
    const nameInput = document.getElementById('custName');
    const gradeSelect = document.getElementById('custGrade');
    if (nameInput) nameInput.value = name;
    if (gradeSelect) gradeSelect.value = grade;
    if (addBuyerBtn) addBuyerBtn.innerText = "수정 하기";
    window.scrollTo(0, 0);
};

// 실시간 데이터 감시 (customers / lizards) - 생략
onSnapshot(query(collection(db, "customers"), orderBy("timestamp", "desc")), (snap) => {
    const list = document.getElementById('customerList');
    const select = document.getElementById('buyerSelect');
    if (list) list.innerHTML = "";
    if (select) select.innerHTML = '<option value="">구매자 연동</option>';
    snap.forEach(doc => {
        const d = doc.data();
        if (list) list.insertAdjacentHTML('beforeend', `<tr><td>${d.name}</td><td>${d.contact || '-'}</td><td>${d.grade}</td><td><button onclick="startEdit('${doc.id}', '${d.name}', '${d.grade}')" class="btn-edit">수정</button><button onclick="deleteData('customers', '${doc.id}')" class="btn-del">삭제</button></td></tr>`);
        if (select) select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
});

onSnapshot(query(collection(db, "lizards"), orderBy("timestamp", "desc")), (snap) => {
    const list = document.getElementById('lizardList');
    if (list) list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        if (list) list.insertAdjacentHTML('beforeend', `<tr><td><b>${d.code}</b></td><td>${d.morph}</td><td>${d.parents.father}/${d.parents.mother}</td><td>${d.owner || '미분양'}</td><td><button onclick="deleteData('lizards', '${doc.id}')" class="btn-del">삭제</button></td></tr>`);
    });
});