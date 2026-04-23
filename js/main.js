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
let editingLizardId = null;

// 2. 탭 전환 기능 (시세 그래프 로직 제거)
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

// 6. 개체(도마뱀) 등록 및 수정
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
                await updateDoc(doc(db, "lizards", editingLizardId), {
                    yearPrefix, morph, parents: { father: fId, mother: mId }, owner
                });
                alert("개체 정보가 수정되었습니다.");
                editingLizardId = null;
                addLizardBtn.innerText = "개체 등록";
            } else {
                const snap = await getDocs(collection(db, "lizards"));
                const nextId = snap.size + 1;
                const fullCode = `${yearPrefix}${morph} ${nextId}/${fId}/${mId}`;

                await addDoc(collection(db, "lizards"), {
                    code: fullCode, yearPrefix, morph, parents: { father: fId, mother: mId },
                    owner, timestamp: serverTimestamp()
                });
                alert("개체 등록 완료: " + fullCode);
            }
            document.getElementById('lizardYear').value = "";
            document.getElementById('morph').value = "";
            document.getElementById('fatherId').value = "";
            document.getElementById('motherId').value = "";
        } catch (e) { alert("처리 중 에러가 발생했습니다."); }
    };
}

// 7. 수정 모드 함수 (전역)
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

// 8. 실시간 데이터 출력 (구매자/개체)
onSnapshot(query(collection(db, "customers"), orderBy("timestamp", "desc")), (snap) => {
    const list = document.getElementById('customerList');
    const select = document.getElementById('buyerSelect');
    if (list) list.innerHTML = "";
    if (select) select.innerHTML = '<option value="">구매자 선택</option>';
    
    snap.forEach(doc => {
        const d = doc.data();
        if (list) {
            list.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${d.name}</td>
                    <td>${d.contact || '-'}</td>
                    <td><span class="grade-${d.grade}">${d.grade}</span></td>
                    <td>
                        <button onclick="startEdit('${doc.id}', '${d.name}', '${d.grade}')" class="btn-edit">수정</button>
                        <button onclick="deleteData('customers', '${doc.id}')" class="btn-del">삭제</button>
                    </td>
                </tr>`);
        }
        if (select) select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
});

onSnapshot(query(collection(db, "lizards"), orderBy("timestamp", "desc")), (snap) => {
    const list = document.getElementById('lizardList');
    if (list) list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.insertAdjacentHTML('beforeend', `
            <tr>
                <td><b>${d.code}</b></td>
                <td>${d.morph}</td>
                <td>${d.parents.father}/${d.parents.mother}</td>
                <td>${d.owner || '미분양'}</td>
                <td>
                    <button onclick="startEditLizard('${doc.id}', '${d.yearPrefix || ''}', '${d.morph}', '${d.parents.father}', '${d.parents.mother}', '${d.owner}')" class="btn-edit">수정</button>
                    <button onclick="deleteData('lizards', '${doc.id}')" class="btn-del">삭제</button>
                </td>
            </tr>`);
    });
});

// 9. 삭제 함수
window.deleteData = async (col, id) => {
    if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, col, id));
};