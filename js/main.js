import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
    doc, deleteDoc, updateDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 초기 변수 및 데이터 저장소 설정
const ADMINS = ["pmr08042002com@gmail.com", "gkwit123y@gmail.com"]; 
const provider = new GoogleAuthProvider();

let editingId = null; 
let editingLizardId = null;
let allCustomers = []; // 실시간 구매자 데이터 저장
let allLizards = [];   // 실시간 개체 데이터 저장

// 2. 탭 전환 기능
window.showSection = (sectionId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-menu button').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        const activeBtn = document.querySelector(`button[onclick="showSection('${sectionId}')"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
};

// 3. 인증 상태 감지
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

// 4. 로그인/로그아웃 실행
document.getElementById('authBtn').onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) await signOut(auth);
    } else {
        await signInWithPopup(auth, provider);
    }
};

// 5. 검색 및 정렬 렌더링 함수
const renderCustomers = () => {
    const list = document.getElementById('customerList');
    const searchTerm = document.getElementById('buyerSearch')?.value.toLowerCase() || "";
    const sortVal = document.getElementById('buyerSort')?.value || "recent";

    let filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm) || 
        (c.contact && c.contact.includes(searchTerm))
    );

    if (sortVal === "name_asc") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === "grade_desc") {
        const priority = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
        filtered.sort((a, b) => (priority[b.grade] || 0) - (priority[a.grade] || 0));
    }

    if (list) {
        list.innerHTML = filtered.map(d => `
            <tr>
                <td>${d.name}</td>
                <td>${d.contact || '-'}</td>
                <td><span class="grade-${d.grade}">${d.grade}</span></td>
                <td>
                    <button onclick="startEdit('${d.id}', '${d.name}', '${d.grade}')" class="btn-edit">수정</button>
                    <button onclick="deleteData('customers', '${d.id}')" class="btn-del">삭제</button>
                </td>
            </tr>`).join('');
    }
};

const renderLizards = () => {
    const list = document.getElementById('lizardList');
    const searchTerm = document.getElementById('lizardSearch')?.value.toLowerCase() || "";
    const sortVal = document.getElementById('lizardSort')?.value || "recent";

    let filtered = allLizards.filter(l => 
        l.morph.toLowerCase().includes(searchTerm) || 
        l.code.toLowerCase().includes(searchTerm) ||
        (l.owner && l.owner.toLowerCase().includes(searchTerm))
    );

    if (sortVal === "unassigned") {
        filtered = filtered.filter(l => !l.owner || l.owner === "" || l.owner === "미분양");
    } else if (sortVal === "morph_asc") {
        filtered.sort((a, b) => a.morph.localeCompare(b.morph));
    } else if (sortVal === "name_asc") {
        filtered.sort((a, b) => (a.owner || "힣").localeCompare(b.owner || "힣"));
    }

    if (list) {
        list.innerHTML = filtered.map(d => `
            <tr>
                <td><b>${d.code}</b></td>
                <td>${d.morph}</td>
                <td>${d.parents.father}/${d.parents.mother}</td>
                <td>${d.owner || '미분양'}</td>
                <td>
                    <button onclick="startEditLizard('${d.id}', '${d.yearPrefix || ''}', '${d.morph}', '${d.lizardNum || ''}', '${d.parents.father}', '${d.parents.mother}', '${d.owner}')" class="btn-edit">수정</button>
                    <button onclick="deleteData('lizards', '${d.id}')" class="btn-del">삭제</button>
                </td>
            </tr>`).join('');
    }
};

// 6. 이벤트 리스너 연결
document.getElementById('buyerSearch')?.addEventListener('input', renderCustomers);
document.getElementById('buyerSort')?.addEventListener('change', renderCustomers);
document.getElementById('lizardSearch')?.addEventListener('input', renderLizards);
document.getElementById('lizardSort')?.addEventListener('change', renderLizards);

// 7. 데이터 등록 및 수정 로직
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
                await addDoc(collection(db, "customers"), { name, contact, grade, timestamp: serverTimestamp() });
            }
            document.getElementById('custName').value = "";
            document.getElementById('custContact').value = "";
        } catch (e) { alert("저장 실패!"); }
    };
}

const addLizardBtn = document.getElementById('addLizardBtn');
if (addLizardBtn) {
    addLizardBtn.onclick = async () => {
        const yearPrefix = document.getElementById('lizardYear').value;
        const morph = document.getElementById('morph').value;
        const lizardNum = document.getElementById('lizardId').value.trim(); // 수동 입력 값
        const fId = document.getElementById('fatherId').value || "0";
        const mId = document.getElementById('motherId').value || "0";
        const owner = document.getElementById('buyerSelect').value;

        // 필수 입력 체크 (번호 포함)
        if (!yearPrefix || !morph || !lizardNum) {
            return alert("연도, 모프, 그리고 개체 번호를 모두 입력해주세요!");
        }

        try {
            const snap = await getDocs(collection(db, "lizards"));
            const existingDocs = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
            
            const fullCode = `${yearPrefix}${morph} ${lizardNum}/${fId}/${mId}`;

            // --- 중복 체크: 모프/연도 상관없이 lizardNum이 같은지 확인 ---
            const isDuplicateNum = existingDocs.some(d => 
                d.id !== editingLizardId && String(d.lizardNum) === String(lizardNum)
            );

            if (isDuplicateNum) {
                return alert(`⚠️ 중복 오류: [${lizardNum}]번은 이미 등록된 번호입니다. 세상에 하나뿐인 번호를 입력해주세요.`);
            }

            if (editingLizardId) {
                // 수정 모드
                await updateDoc(doc(db, "lizards", editingLizardId), {
                    code: fullCode, 
                    yearPrefix, 
                    morph, 
                    lizardNum, 
                    parents: { father: fId, mother: mId }, 
                    owner
                });
                alert("정보 수정 완료!");
                editingLizardId = null;
                addLizardBtn.innerText = "개체 등록";
            } else {
                // 신규 등록
                await addDoc(collection(db, "lizards"), {
                    code: fullCode, 
                    yearPrefix, 
                    morph, 
                    lizardNum, 
                    parents: { father: fId, mother: mId }, 
                    owner, 
                    timestamp: serverTimestamp()
                });
                alert("등록 완료: " + fullCode);
            }
            
            // 필드 초기화
            document.getElementById('lizardYear').value = "";
            document.getElementById('morph').value = "";
            document.getElementById('lizardId').value = "";
            document.getElementById('fatherId').value = "";
            document.getElementById('motherId').value = "";
        } catch (e) { 
            alert("처리 중 오류가 발생했습니다."); 
        }
    };
}

// 8. 수정 모드 함수
window.startEdit = (id, name, grade) => {
    editingId = id;
    document.getElementById('custName').value = name;
    document.getElementById('custGrade').value = grade;
    document.getElementById('addBuyerBtn').innerText = "수정 하기";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.startEditLizard = (id, year, morph, num, fId, mId, owner) => {
    editingLizardId = id;
    document.getElementById('lizardYear').value = year || "";
    document.getElementById('morph').value = morph;
    document.getElementById('lizardId').value = num || "";
    document.getElementById('fatherId').value = fId;
    document.getElementById('motherId').value = mId;
    document.getElementById('buyerSelect').value = owner;
    document.getElementById('addLizardBtn').innerText = "개체 정보 수정";
    showSection('lizardSection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 9. 실시간 데이터 수신 및 렌더링
onSnapshot(query(collection(db, "customers"), orderBy("timestamp", "desc")), (snap) => {
    allCustomers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const select = document.getElementById('buyerSelect');
    if (select) {
        select.innerHTML = '<option value="">구매자 선택</option>' + 
            allCustomers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
    renderCustomers();
});

onSnapshot(query(collection(db, "lizards"), orderBy("timestamp", "desc")), (snap) => {
    allLizards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderLizards();
});

// 10. 삭제 함수
window.deleteData = async (col, id) => {
    if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, col, id));
};