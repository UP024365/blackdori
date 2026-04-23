import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
    doc, deleteDoc, updateDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 초기 변수 설정
const ADMINS = ["pmr08042002com@gmail.com", "gkwit123y@gmail.com"]; 
const provider = new GoogleAuthProvider();
let editingId = null; 
let marketChart = null;

// 2. 탭 전환 및 그래프 초기화
window.showSection = (sectionId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        if (sectionId === 'marketSection') initChart();
    }
};

function initChart() {
    const ctx = document.getElementById('marketChart')?.getContext('2d');
    if (!ctx) return;
    if (marketChart) marketChart.destroy();
    marketChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['11월', '12월', '1월', '2월', '3월', '4월'],
            datasets: [{ label: '평균 시세', data: [15, 18, 16, 21, 19, 23], borderColor: '#2ecc71' }]
        }
    });
}

// 3. 인증 상태 감지 (관리자라면 입력창 보이기)
onAuthStateChanged(auth, (user) => {
    const authBtn = document.getElementById('authBtn');
    const inputSections = document.querySelectorAll('.input-section');
    if (user && ADMINS.includes(user.email.toLowerCase())) {
        inputSections.forEach(el => el.style.display = "grid");
        if (authBtn) authBtn.innerText = "로그아웃";
    } else {
        inputSections.forEach(el => el.style.display = "none");
        if (authBtn) authBtn.innerText = "관리자 로그인";
    }
});

// 4. 로그인/로그아웃 버튼
document.getElementById('authBtn').onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) await signOut(auth);
    } else {
        await signInWithPopup(auth, provider);
    }
};

// 5. 구매자 등록 및 수정
const addBuyerBtn = document.getElementById('addBuyerBtn');
if (addBuyerBtn) {
    addBuyerBtn.onclick = async () => {
        const name = document.getElementById('custName').value;
        const contact = document.getElementById('custContact').value;
        const grade = document.getElementById('custGrade').value;

        if (!name) return alert("이름을 입력하세요!");

        try {
            if (editingId) {
                await updateDoc(doc(db, "customers", editingId), { name, contact, grade });
                editingId = null;
                addBuyerBtn.innerText = "구매자 등록";
            } else {
                await addDoc(collection(db, "customers"), {
                    name, contact, grade, timestamp: serverTimestamp()
                });
            }
            document.getElementById('custName').value = "";
            document.getElementById('custContact').value = "";
        } catch (e) { alert("저장 실패!"); }
    };
}

// 6. 개체(도마뱀) 등록 (코드 자동 생성)
const addLizardBtn = document.getElementById('addLizardBtn');
if (addLizardBtn) {
    addLizardBtn.onclick = async () => {
        const morph = document.getElementById('morph').value;
        const fId = document.getElementById('fatherId').value || "0";
        const mId = document.getElementById('motherId').value || "0";
        const owner = document.getElementById('buyerSelect').value;

        if (!morph) return alert("모프를 입력하세요!");

        try {
            const snap = await getDocs(collection(db, "lizards"));
            const nextId = snap.size + 1;
            const fullCode = `2026${morph} ${nextId}/${fId}/${mId}`;

            await addDoc(collection(db, "lizards"), {
                code: fullCode, morph, parents: { father: fId, mother: mId },
                owner, timestamp: serverTimestamp()
            });
            alert("개체 등록 완료: " + fullCode);
            document.getElementById('morph').value = "";
        } catch (e) { alert("등록 에러!"); }
    };
}

// 7. 실시간 데이터 출력 (구매자/개체)
onSnapshot(query(collection(db, "customers"), orderBy("timestamp", "desc")), (snap) => {
    const list = document.getElementById('customerList');
    const select = document.getElementById('buyerSelect');
    if (list) list.innerHTML = "";
    if (select) select.innerHTML = '<option value="">구매자 선택</option>';
    snap.forEach(doc => {
        const d = doc.data();
        list.insertAdjacentHTML('beforeend', `<tr><td>${d.name}</td><td>${d.contact}</td><td>${d.grade}</td><td><button onclick="startEdit('${doc.id}', '${d.name}', '${d.grade}')" class="btn-edit">수정</button><button onclick="deleteData('customers', '${doc.id}')" class="btn-del">삭제</button></td></tr>`);
        select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
});

onSnapshot(query(collection(db, "lizards"), orderBy("timestamp", "desc")), (snap) => {
    const list = document.getElementById('lizardList');
    if (list) list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.insertAdjacentHTML('beforeend', `<tr><td><b>${d.code}</b></td><td>${d.morph}</td><td>${d.parents.father}/${d.parents.mother}</td><td>${d.owner || '미분양'}</td><td><button onclick="deleteData('lizards', '${doc.id}')" class="btn-del">삭제</button></td></tr>`);
    });
});

// 전역 함수 등록 (삭제/수정)
window.deleteData = async (col, id) => { if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, col, id)); };
window.startEdit = (id, name, grade) => {
    editingId = id;
    document.getElementById('custName').value = name;
    document.getElementById('custGrade').value = grade;
    document.getElementById('addBuyerBtn').innerText = "수정 하기";
    window.scrollTo(0, 0);
};