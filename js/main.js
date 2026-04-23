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

// ... (1, 2번 상단 import 및 초기 설정은 기존과 동일)

// 3. 로그인/로그아웃 동작
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
    document.getElementById(sectionId).style.display = 'block';
    if(sectionId === 'marketSection') initChart(); // 시세 탭 클릭 시 그래프 로드
};

// 4. 구매자(Customer) 데이터 저장 및 수정
addBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const contact = document.getElementById('custContact')?.value || ""; // 연락처 필드 추가 대비
    const grade = document.getElementById('custGrade').value;

    if (!name) return alert("이름을 입력하세요! 🦎");

    try {
        if (editingId) {
            await updateDoc(doc(db, "customers", editingId), { name, contact, grade });
            alert("구매자 정보 수정 완료!");
            editingId = null;
            addBtn.innerText = "신규 등록";
        } else {
            await addDoc(collection(db, "customers"), {
                name, contact, grade,
                timestamp: serverTimestamp(),
                manager: auth.currentUser.email
            });
            alert("구매자 등록 완료!");
        }
        document.getElementById('custName').value = "";
        if(document.getElementById('custContact')) document.getElementById('custContact').value = "";
    } catch (e) { alert("권한이 없습니다."); }
});

// 5. 도마뱀(Lizard) 개체 등록 및 코드 생성 로직
// 고유번호 형식: 2026(모프) (고유ID)/(부ID)/(모ID)
window.registerLizard = async () => {
    const morph = document.getElementById('morph').value;
    const fId = document.getElementById('fatherId').value || "0";
    const mId = document.getElementById('motherId').value || "0";
    const owner = document.getElementById('buyerSelect').value;

    if (!morph) return alert("모프를 입력해주세요!");

    try {
        // 현재 등록된 전체 개체 수를 확인하여 다음 ID 생성
        const snapshot = await getDocs(collection(db, "lizards"));
        const nextId = snapshot.size + 1;
        const generatedCode = `2026${morph} ${nextId}/${fId}/${mId}`;

        await addDoc(collection(db, "lizards"), {
            code: generatedCode,
            morph,
            parents: { father: fId, mother: mId },
            owner: owner, // 선택된 구매자 이름 연동
            timestamp: serverTimestamp()
        });
        alert(`개체 등록 완료!\n코드: ${generatedCode}`);
        
        // 입력창 초기화
        document.getElementById('morph').value = "";
        document.getElementById('fatherId').value = "";
        document.getElementById('motherId').value = "";
    } catch (e) {
        console.error(e);
        alert("개체 등록 중 오류가 발생했습니다.");
    }
};

// 6. 시세 그래프 로직 (Chart.js 활용)
let marketChart;
function initChart() {
    const ctx = document.getElementById('marketChart')?.getContext('2d');
    if (!ctx) return;
    if (marketChart) marketChart.destroy();

    // 임시 시세 데이터 (네이버 카페 API 연동 전까지 사용)
    const data = {
        labels: ['11월', '12월', '1월', '2월', '3월', '4월'],
        datasets: [{
            label: '월별 평균 시세 (원)',
            data: [150000, 175000, 160000, 220000, 195000, 240000],
            borderColor: '#2ecc71',
            tension: 0.3
        }]
    };

    marketChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: { responsive: true }
    });
}

// 7. 삭제 및 수정 기능 (전역)
window.deleteData = async (col, id) => {
    if (confirm("정말로 삭제하시겠습니까? 🚮")) {
        try {
            await deleteDoc(doc(db, col, id));
            alert("삭제되었습니다.");
        } catch (e) { alert("삭제 권한이 없습니다."); }
    }
};

window.startEdit = (id, name, contact, grade) => {
    editingId = id;
    document.getElementById('custName').value = name;
    if(document.getElementById('custContact')) document.getElementById('custContact').value = contact;
    document.getElementById('custGrade').value = grade;
    addBtn.innerText = "수정 하기";
    window.scrollTo(0, 0);
};

// 8. 실시간 리스트 출력 및 구매자 선택창 업데이트
// (1) 구매자 리스트 & 연동용 Select 업데이트
const qBuyers = query(collection(db, "customers"), orderBy("timestamp", "desc"));
onSnapshot(qBuyers, (snapshot) => {
    const buyerList = document.getElementById('customerList');
    const buyerSelect = document.getElementById('buyerSelect');
    if (buyerList) buyerList.innerHTML = "";
    if (buyerSelect) buyerSelect.innerHTML = '<option value="">구매자 선택 (연동)</option>';

    snapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;
        
        // 표 업데이트
        const row = `
            <tr>
                <td>${data.name}</td>
                <td>${data.contact || '-'}</td>
                <td><span class="grade-${data.grade}">${data.grade}</span></td>
                <td>
                    <button onclick="startEdit('${id}', '${data.name}', '${data.contact}', '${data.grade}')" class="btn-edit">수정</button>
                    <button onclick="deleteData('customers', '${id}')" class="btn-del">삭제</button>
                </td>
            </tr>`;
        if (buyerList) buyerList.insertAdjacentHTML('beforeend', row);
        
        // 개체 등록용 드롭다운 업데이트
        if (buyerSelect) buyerSelect.innerHTML += `<option value="${data.name}">${data.name}</option>`;
    });
});

// (2) 도마뱀 개체 리스트 출력
const qLizards = query(collection(db, "lizards"), orderBy("timestamp", "desc"));
onSnapshot(qLizards, (snapshot) => {
    const lizardList = document.getElementById('lizardList');
    if (!lizardList) return;
    lizardList.innerHTML = "";
    
    snapshot.forEach((doc) => {
        const data = doc.data();
        const row = `
            <tr>
                <td><b>${data.code}</b></td>
                <td>${data.morph}</td>
                <td>${data.parents.father} / ${data.parents.mother}</td>
                <td>${data.owner || '<span style="color:gray;">미분양</span>'}</td>
                <td>
                    <button onclick="deleteData('lizards', '${doc.id}')" class="btn-del">삭제</button>
                </td>
            </tr>`;
        lizardList.insertAdjacentHTML('beforeend', row);
    });
});