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

// 5. [추가] 검색 및 정렬 렌더링 함수
const renderCustomers = () => {
    const list = document.getElementById('customerList');
    const searchTerm = document.getElementById('buyerSearch')?.value.toLowerCase() || "";
    const sortVal = document.getElementById('buyerSort')?.value || "recent";

    let filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm) || 
        (c.contact && c.contact.includes(searchTerm))
    );

    // 정렬 로직
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

    // 정렬 및 필터 로직
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
                    <button onclick="startEditLizard('${d.id}', '${d.yearPrefix || ''}', '${d.morph}', '${d.parents.father}', '${d.parents.mother}', '${d.owner}')" class="btn-edit">수정</button>
                    <button onclick="deleteData('lizards', '${d.id}')" class="btn-del">삭제</button>
                </td>
            </tr>`).join('');
    }
};

// 6. 이벤트 리스너 연결 (검색창 입력 시 즉시 반영)
document.getElementById('buyerSearch').addEventListener('input', renderCustomers);
document.getElementById('buyerSort').addEventListener('change', renderCustomers);
document.getElementById('lizardSearch').addEventListener('input', renderLizards);
document.getElementById('lizardSort').addEventListener('change', renderLizards);

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
        const fId = document.getElementById('fatherId').value || "0";
        const mId = document.getElementById('motherId').value || "0";
        const owner = document.getElementById('buyerSelect').value;

        if (!yearPrefix || !morph) return alert("연도와 모프를 입력하세요!");

        try {
            if (editingLizardId) {
                // 수정 모드일 때는 중복 체크를 건너뛰거나 본인 제외 체크를 할 수 있지만, 
                // 보통 수정 시에는 코드가 고정이므로 바로 업데이트합니다.
                await updateDoc(doc(db, "lizards", editingLizardId), {
                    yearPrefix, morph, parents: { father: fId, mother: mId }, owner
                });
                alert("개체 정보가 수정되었습니다.");
                editingLizardId = null;
                addLizardBtn.innerText = "개체 등록";
            } else {
                // [중복 방지 로직 추가]
                const snap = await getDocs(collection(db, "lizards"));
                const nextId = snap.size + 1;
                const fullCode = `${yearPrefix}${morph} ${nextId}/${fId}/${mId}`;

                // 기존 데이터 중 동일한 코드가 있는지 확인
                const isDuplicate = snap.docs.some(doc => doc.data().code === fullCode);
                
                if (isDuplicate) {
                    return alert("이미 등록된 고유 코드입니다: " + fullCode);
                }

                await addDoc(collection(db, "lizards"), {
                    code: fullCode, 
                    yearPrefix, 
                    morph, 
                    parents: { father: fId, mother: mId },
                    owner, 
                    timestamp: serverTimestamp()
                });
                alert("개체 등록 완료: " + fullCode);
            }
            
            // 입력 필드 초기화
            document.getElementById('lizardYear').value = "";
            document.getElementById('morph').value = "";
            document.getElementById('fatherId').value = "";
            document.getElementById('motherId').value = "";
        } catch (e) { 
            console.error(e);
            alert("처리 중 에러가 발생했습니다."); 
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

window.startEditLizard = (id, year, morph, fId, mId, owner) => {
    editingLizardId = id;
    document.getElementById('lizardYear').value = year || "";
    document.getElementById('morph').value = morph;
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
    
    // 소유주 선택 셀렉트 박스 갱신
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