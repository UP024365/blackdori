console.log("main.js 파일이 성공적으로 로드되었습니다! 🚀");
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// HTML 요소 가져오기
const customerList = document.getElementById('customerList');
const addBtn = document.getElementById('addBtn');

// 1. 데이터 저장 (등록 버튼 클릭 시)
// 기존 addBtn.onclick = async () => { ... } 대신 아래 코드로 수정
document.getElementById('addBtn').addEventListener('click', async () => {
    console.log("등록 버튼이 클릭되었습니다!"); // 클릭 확인용 로그
    
    const name = document.getElementById('custName').value;
    const type = document.getElementById('lizardType').value;
    const grade = document.getElementById('custGrade').value;

    if (!name || !type) {
        alert("이름과 도마뱀 종류를 입력해주세요! 🦎");
        return;
    }

    try {
        await addDoc(collection(db, "customers"), {
            name: name,
            type: type,
            grade: grade,
            timestamp: serverTimestamp()
        });
        alert("저장 완료!");
        document.getElementById('custName').value = "";
        document.getElementById('lizardType').value = "";
    } catch (e) {
        console.error("저장 중 오류 발생:", e);
        alert("저장 실패! 콘솔창을 확인하세요.");
    }
});

// 2. 데이터 실시간 불러오기 (화면 업데이트)
const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    customerList.innerHTML = ""; // 기존 리스트 비우기
    
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
});