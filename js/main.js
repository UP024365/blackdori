import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
    doc, deleteDoc, updateDoc, getDocs // getDocs 추가됨
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 관리자 설정
const ADMINS = ["pmr08042002com@gmail.com", "gkwit123y@gmail.com"]; 
const provider = new GoogleAuthProvider();
let editingId = null; 

// HTML 요소 연결 (ID를 HTML과 일치시켰습니다)
const customerList = document.getElementById('customerList');
const addBuyerBtn = document.getElementById('addBuyerBtn'); // ID 수정
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

// --- [공통] 탭 전환 기능 ---
window.showSection = (sectionId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';
    if (sectionId === 'marketSection') initChart();
};

// 4. 구매자(Customer) 데이터 저장 및 수정
if (addBuyerBtn) {
    addBuyerBtn.addEventListener('click', async () => {
        const name = document.getElementById('custName').value;
        const grade = document.getElementById('custGrade').value;
        const contact = document.getElementById('custContact')?.value || "";

        if (!name) return alert("이름을 입력하세요! 🦎");

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
                alert("등록 완료!");
            }
            document.getElementById('custName').value = "";
            if (document.getElementById('custContact')) document.getElementById('custContact').value = "";
        } catch (e) {
            console.error(e);
            alert("저장 권한이 없습니다.");
        }
    });
}

// 5. 도마뱀(Lizard) 개체 등록 (코드 자동 생성)
const addLizardBtn = document.getElementById('addLizardBtn');
if (addLizardBtn) {
    addLizardBtn.onclick = async () => {
        const morph = document.getElementById('morph').value;
        const fId = document.getElementById('fatherId').value || "0";
        const mId = document.getElementById('motherId').value || "0";
        const owner = document.getElementById('buyerSelect').value;

        if (!morph) return alert("모프를 입력하세요!");

        try {
            const snapshot = await getDocs(collection(db, "lizards"));
            const nextId = snapshot.size + 1;
            const fullCode = `2026${morph} ${nextId}/${fId}/${mId}`;

            await addDoc(collection(db, "lizards"), {
                code: fullCode,
                morph,
                parents: { father: fId, mother: mId },
                owner,
                timestamp: serverTimestamp()
            });
            alert("개체 등록 완료: " + fullCode);
            document.getElementById('morph').value = "";
        } catch (e) { alert("등록 에러!"); }
    };
}

// 6. 시세 그래프 (Chart.js)
let marketChart;
function initChart() {
    const ctx = document.getElementById('marketChart')?.getContext('2d');
    if (!ctx) return;
    if (marketChart) marketChart.destroy();
    marketChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['11월', '12월', '1월', '2월', '3월', '4월'],
            datasets: [{
                label: '평균 시세 (원)',
                data: [150000, 180000, 165000, 210000, 190000, 230000],
                borderColor: '#2ecc71'
            }]
        }
    });
}

// 7. 실시간 리스트 및 연동 업데이트
const qBuyers = query(collection(db, "customers"), orderBy("timestamp", "desc"));
onSnapshot(qBuyers, (snapshot) => {
    if (customerList) {
        customerList.innerHTML = "";
        const buyerSelect = document.getElementById('buyerSelect');
        if (buyerSelect) buyerSelect.innerHTML = '<option value="">구매자 선택 (연동)</option>';

        snapshot.forEach((customerDoc) => {
            const data = customerDoc.data();
            const id = customerDoc.id;
            
            // 표 출력
            const row = `
                <tr>
                    <td>${data.name}</td>
                    <td>${data.contact || '-'}</td>
                    <td><span class="grade-${data.grade}">${data.grade}</span></td>
                    <td>
                        <button onclick="startEdit('${id}', '${data.name}', '${data.grade}')" class="btn-edit">수정</button>
                        <button onclick="deleteData('customers', '${id}')" class="btn-del">삭제</button>
                    </td>
                </tr>`;
            customerList.insertAdjacentHTML('beforeend', row);
            
            // 드롭다운 업데이트
            if (buyerSelect) buyerSelect.innerHTML += `<option value="${data.name}">${data.name}</option>`;
        });
    }
});

// 개체 리스트 출력
const lizardList = document.getElementById('lizardList');
onSnapshot(query(collection(db, "lizards"), orderBy("timestamp", "desc")), (snapshot) => {
    if (lizardList) {
        lizardList.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            lizardList.innerHTML += `
                <tr>
                    <td><b>${data.code}</b></td>
                    <td>${data.morph}</td>
                    <td>${data.parents.father}/${data.parents.mother}</td>
                    <td>${data.owner || '미분양'}</td>
                    <td><button onclick="deleteData('lizards', '${doc.id}')" class="btn-del">삭제</button></td>
                </tr>`;
        });
    }
});

// 전역 함수들
window.deleteData = async (col, id) => {
    if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, col, id));
};

window.startEdit = (id, name, grade) => {
    editingId = id;
    document.getElementById('custName').value = name;
    document.getElementById('custGrade').value = grade;
    if (addBuyerBtn) addBuyerBtn.innerText = "수정 하기";
    window.scrollTo(0, 0);
};