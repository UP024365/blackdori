import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
    doc, deleteDoc, updateDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. 초기 변수 및 네이버 API 설정
const ADMINS = ["pmr08042002com@gmail.com", "gkwit123y@gmail.com"]; 
const provider = new GoogleAuthProvider();
const NAVER_ID = "SXRfljvgqYEBnX35Uq6T";
const NAVER_SECRET = "R3k_Rl4v1z";

let editingId = null; 
let marketChart = null;
let editingLizardId = null;

// 2. 탭 전환 및 기간별 그래프 업데이트
window.showSection = (sectionId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-menu button').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        const activeBtn = document.querySelector(`button[onclick="showSection('${sectionId}')"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // 시세 탭(이제 카페 뷰어) 클릭 시 필요한 로직이 있다면 여기에 작성
    }
};

// 3. 시세 정보 로직 (네이버 API 연동 및 그래프)
window.updateChartPeriod = async (period) => {
    // 필터 버튼 활성화 스타일 처리
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.includes(period.replace('m',''))) btn.classList.add('active');
    });

    // 네이버 카페 데이터 수집 및 평균 계산 (시뮬레이션 포함)
    const data = await fetchMarketData(period);
    renderMarketChart(data);
};

async function fetchMarketData(period) {
    const counts = period === '6m' ? 6 : (period === '3m' ? 3 : 1);
    const labels = [];
    const values = [];
    const now = new Date();

    for (let i = counts - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(`${d.getMonth() + 1}월`);
        // 실제 운영 시 이곳에서 네이버 검색 API 결과의 월별 평균값을 계산하여 넣습니다.
        values.push(Math.floor(Math.random() * (35 - 20 + 1)) + 20); 
    }
    return { labels, values };
}

function renderMarketChart(data) {
    const ctx = document.getElementById('marketChart')?.getContext('2d');
    if (!ctx) return;

    if (marketChart) marketChart.destroy();

    marketChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: '평균 시세 (만원)',
                data: data.values,
                borderColor: '#111', // 각진 디자인에 맞춘 블랙
                borderWidth: 3,
                tension: 0, // 곡선 제거 (각진 느낌)
                pointBackgroundColor: '#111',
                pointRadius: 4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: false,
                    grid: { color: '#eee' },
                    ticks: { font: { family: 'Pretendard' } }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// 4. 인증 상태 감지
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

// 5. 로그인/로그아웃 실행
document.getElementById('authBtn').onclick = async () => {
    if (auth.currentUser) {
        if (confirm("로그아웃 하시겠습니까?")) await signOut(auth);
    } else {
        await signInWithPopup(auth, provider);
    }
};

// 6. 데이터 등록 및 수정 (기존 로직 유지)
// [구매자 등록/수정]
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

// [개체 등록/수정]
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

// 8. 실시간 데이터 스냅샷
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