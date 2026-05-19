let currentExamQuestions = [];
let currentPage = 0;
const pageSize = 10; // 한 페이지에 보여줄 문제 수
let userAnswers = [];
let isPracticeMode = false;
let currentSessionData = null;

// 각 문제별로 연습모드에서 정답 확인이 완료되었는지 추적하는 배열
let practiceChecked = []; 

document.addEventListener('DOMContentLoaded', () => {
    const countBtns = document.querySelectorAll('.count-select button');
    countBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            countBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('startExamBtn').addEventListener('click', () => startExam(false));
    document.getElementById('startPracticeBtn').addEventListener('click', () => startExam(true));
    document.getElementById('historyBtn').addEventListener('click', showHistoryList);
    
    document.getElementById('prevBtn').addEventListener('click', goPrevPage);
    document.getElementById('nextBtn').addEventListener('click', goNextPage);
    document.getElementById('quitBtn').addEventListener('click', finishExam);
    
    document.getElementById('exitToMainBtn').addEventListener('click', () => {
        if(confirm("메인으로 돌아가시겠습니까?")) showMainScreen();
    });

    document.getElementById('restartBtn').addEventListener('click', () => location.reload());
    document.getElementById('backToStartBtn').addEventListener('click', showMainScreen);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearAllHistory);
    document.getElementById('backToHistoryBtn').addEventListener('click', showHistoryList);
    
    const downloadBtn = document.getElementById('downloadTxtBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (currentSessionData) downloadTxt(currentSessionData);
        });
    }
});

function startExam(practiceMode) {
    if (!window.questions || window.questions.length === 0) {
        return alert("문제 데이터가 없습니다. 새로고침 후 다시 시도해주세요.");
    }
    
    isPracticeMode = practiceMode;
    const countBtn = document.querySelector('.count-select button.active');
    let count = 30;
    
    if (countBtn) {
        const val = countBtn.getAttribute('data-count');
        if (val === 'all') {
            count = window.questions.length;
        } else {
            count = parseInt(val);
            if (isNaN(count)) count = window.questions.length;
        }
    }

    if (count > window.questions.length) count = window.questions.length;

    currentExamQuestions = [...window.questions].sort(() => Math.random() - 0.5).slice(0, count);
    currentPage = 0;
    userAnswers = new Array(count).fill(null);
    practiceChecked = new Array(count).fill(false); // 연습모드 체크 상태 초기화

    showScreen(document.getElementById('exam-screen'));
    const badge = document.getElementById('mode-badge');
    badge.innerText = isPracticeMode ? "🎓 연습 모드" : "📝 실전 모드";
    badge.className = isPracticeMode ? 'badge practice-badge' : 'badge real-badge';
    
    renderPage();
}

// ★ 한 페이지에 10문제씩 묶어서 화면에 렌더링하는 함수
function renderPage() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, currentExamQuestions.length);

    // 상단 진행도 표시 업데이트
    document.getElementById('progress').innerText = `페이지 ${currentPage + 1} / ${Math.ceil(currentExamQuestions.length / pageSize)} (총 ${currentExamQuestions.length}문항)`;

    // 10개의 문제를 반복하며 DOM 생성
    for (let i = startIdx; i < endIdx; i++) {
        const q = currentExamQuestions[i];
        
        const qBlock = document.createElement('div');
        qBlock.className = 'question-block';
        
        const qTitle = document.createElement('h3');
        qTitle.innerHTML = `${i + 1}. <span style="color:#007aff;">[${q.category}]</span> ${q.title}`;
        qBlock.appendChild(qTitle);
        
        const optList = document.createElement('ul');
        optList.className = 'options-list';
        
        // 피드백 영역 미리 생성 (연습모드 전용)
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'inline-feedback hidden';
        
        q.options.forEach(opt => {
            const li = document.createElement('li');
            li.innerText = opt;
            
            // 기존에 답을 선택했던 적이 있다면 상태 복원
            if (userAnswers[i] === opt) {
                li.classList.add('selected');
            }
            
            // 이미 연습모드에서 정답 확인이 끝난 문제라면 결과 고정 표시
            if (isPracticeMode && practiceChecked[i]) {
                if (opt === q.answer) li.classList.add('practice-correct');
                if (userAnswers[i] === opt && userAnswers[i] !== q.answer) li.classList.add('practice-wrong');
            }

            li.onclick = () => selectOption(i, opt, optList, feedbackDiv);
            optList.appendChild(li);
        });
        
        qBlock.appendChild(optList);
        qBlock.appendChild(feedbackDiv);
        
        // 만약 연습모드이고 이미 체크했다면 해설창 바로 보여주기
        if (isPracticeMode && practiceChecked[i]) {
            showInlineFeedback(i, feedbackDiv);
        }
        
        container.appendChild(qBlock);
    }

    // 하단 네비게이션 버튼 세팅
    document.getElementById('prevBtn').style.visibility = currentPage === 0 ? 'hidden' : 'visible';
    
    const nextBtn = document.getElementById('nextBtn');
    const isLastPage = (currentPage + 1) * pageSize >= currentExamQuestions.length;
    nextBtn.innerText = isLastPage ? '🎉 최종 제출 및 채점' : '다음 페이지 ▶';
    
    // 페이지 이동 시 상단으로 스크롤 이동
    window.scrollTo(0, 0);
}

function selectOption(qIdx, selectedOpt, optListElement, feedbackDiv) {
    // 연습모드에서 이미 정답 확인이 끝난 문제는 클릭 불가
    if (isPracticeMode && practiceChecked[qIdx]) return;

    userAnswers[qIdx] = selectedOpt;

    // UI 단에서 선택 효과 토글
    const items = optListElement.querySelectorAll('li');
    items.forEach(li => li.classList.remove('selected'));
    
    // 클릭한 요소 찾아서 'selected' 클래스 추가
    for (let li of items) {
        if (li.innerText === selectedOpt) {
            li.classList.add('selected');
            break;
        }
    }

    // ★ 연습모드일 경우: 클릭하자마자 즉시 채점 및 해설 오픈
    if (isPracticeMode) {
        practiceChecked[qIdx] = true;
        items.forEach(li => {
            if (li.innerText === currentExamQuestions[qIdx].answer) li.classList.add('practice-correct');
            if (li.innerText === selectedOpt && selectedOpt !== currentExamQuestions[qIdx].answer) li.classList.add('practice-wrong');
        });
        showInlineFeedback(qIdx, feedbackDiv);
    }
}

// 연습모드용 즉시 해설 출력 보조 함수
function showInlineFeedback(qIdx, feedbackDiv) {
    const q = currentExamQuestions[qIdx];
    const isCorrect = (userAnswers[qIdx] === q.answer);
    
    feedbackDiv.classList.remove('hidden');
    if (!isCorrect) feedbackDiv.classList.add('wrong-border');
    
    feedbackDiv.innerHTML = `
        <div style="font-weight:bold; margin-bottom:5px; color:${isCorrect ? '#28a745' : '#dc3545'}">
            ${isCorrect ? '✅ 정답입니다!' : '❌ 틀렸습니다.'} (정답: ${q.answer})
        </div>
        <div style="color:#555; font-size:0.9rem; line-height:1.4;">💡 <b>해설:</b> ${q.explanation}</div>
    `;
}

function goNextPage() {
    const isLastPage = (currentPage + 1) * pageSize >= currentExamQuestions.length;
    if (!isLastPage) {
        currentPage++;
        renderPage();
    } else {
        finishExam();
    }
}

function goPrevPage() {
    if (currentPage > 0) {
        currentPage--;
        renderPage();
    }
}

function finishExam() {
    // 풀지 않은 문제가 있는지 검사
    const unansCount = userAnswers.filter(ans => ans === null).length;
    let msg = "시험을 종료하고 결과를 확인하시겠습니까?";
    if (unansCount > 0) {
        msg = `아직 풀지 않은 문제가 ${unansCount}개 있습니다. 그래도 제출하시겠습니까?`;
    }
    
    if (!confirm(msg)) return;
    
    let score = 0;
    const stats = {};
    const wrongList = [];

    currentExamQuestions.forEach((q, idx) => {
        const myAns = userAnswers[idx];
        const isCorrect = (myAns === q.answer);
        
        if (!stats[q.category]) stats[q.category] = { total: 0, correct: 0 };
        stats[q.category].total++;

        if (isCorrect) {
            score++;
            stats[q.category].correct++;
        } else {
            wrongList.push({ title: q.title, category: q.category, user: myAns || "미선택", correct: q.answer, exp: q.explanation });
        }
    });
    saveSession(score, currentExamQuestions.length, wrongList);
    showResult(score, currentExamQuestions.length, stats, wrongList);
}

function showResult(score, total, stats, wrongList) {
    showScreen(document.getElementById('result-screen'));
    let percentage = Math.round((score/total)*100);
    let badgeHtml = percentage >= 70 ? '<div class="pass-badge">🎉 합격 (PASS)</div>' : '<div class="fail-badge">😢 불합격 (FAIL)</div>';
    
    document.getElementById('score').innerHTML = `
        ${badgeHtml}
        <div style="font-size:2.5rem; font-weight:800; color:#007aff; margin-bottom:10px;">${percentage}점</div>
        <div style="color:#666;">(총 ${total}문제 중 ${score}개 정답)</div>
    `;

    const statDiv = document.getElementById('category-stats');
    statDiv.innerHTML = '<h4 style="margin-top:30px; border-bottom:2px solid #eee; padding-bottom:10px;">📊 카테고리별 정답률</h4>';
    for (const cat in stats) {
        const rate = Math.round((stats[cat].correct / stats[cat].total) * 100);
        statDiv.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;"><span>${cat}</span> <strong>${rate}%</strong></div>`;
    }

    const wrongDiv = document.getElementById('wrong-list');
    wrongDiv.innerHTML = '';
    if (wrongList.length === 0) {
        wrongDiv.innerHTML = '<p style="text-align:center; padding: 20px; font-weight:bold;">🎉 완벽합니다! 모든 문제를 맞히셨습니다.</p>';
    } else {
        wrongList.forEach(w => {
            const div = document.createElement('div');
            div.className = 'wrong-item';
            div.innerHTML = `
                <div class="wrong-title"><span style="color:#007aff;">[${w.category}]</span> ${w.title}</div>
                <div class="wrong-detail" style="color:#dc3545;">❌ 내 선택: ${w.user}</div>
                <div class="wrong-detail" style="color:#28a745; margin-bottom:10px;">✅ 정답: ${w.correct}</div>
                <div class="wrong-exp">💡 <strong>해설:</strong><br>${w.exp}</div>
            `;
            wrongDiv.appendChild(div);
        });
    }
}

function saveSession(score, total, wrongList) {
    const sessions = JSON.parse(localStorage.getItem('nhn_exam_sessions')) || [];
    const newSession = {
        id: Date.now(), round: sessions.length + 1, mode: isPracticeMode ? '연습' : '실전', date: new Date().toLocaleString(),
        score: `${score} / ${total}`, wrongList: wrongList
    };
    sessions.unshift(newSession);
    localStorage.setItem('nhn_exam_sessions', JSON.stringify(sessions));
}

function showHistoryList() {
    showScreen(document.getElementById('history-screen'));
    const sessions = JSON.parse(localStorage.getItem('nhn_exam_sessions')) || [];
    const container = document.getElementById('history-sessions');
    container.innerHTML = '';

    if (sessions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">저장된 기록이 없습니다.</p>';
        return;
    }

    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML = `
            <div class="session-info">
                <span class="session-title" style="font-weight:bold;">[${session.mode}] ${session.round}회차 (${session.date})</span>
                <span class="session-score" style="color:#007aff; font-weight:bold; margin-left:15px;">${session.score} 정답</span>
            </div>
            <button class="btn-delete-single" style="background:#fff; border:1px solid #ff4d4f; color:#ff4d4f; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.85rem; font-weight:bold;">삭제</button>
        `;
        
        item.onclick = () => showHistoryDetail(session);
        
        const delBtn = item.querySelector('.btn-delete-single');
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`${session.round}회차 기록을 보관함에서 삭제하시겠습니까?`)) {
                deleteSingleHistory(session.id);
            }
        };
        
        container.appendChild(item);
    });
}

function deleteSingleHistory(sessionId) {
    let sessions = JSON.parse(localStorage.getItem('nhn_exam_sessions')) || [];
    sessions = sessions.filter(session => session.id !== sessionId);
    localStorage.setItem('nhn_exam_sessions', JSON.stringify(sessions));
    showHistoryList();
}

function clearAllHistory() {
    if(confirm('모든 기록을 삭제하시겠습니까?')) {
        localStorage.removeItem('nhn_exam_sessions');
        showHistoryList();
    }
}

function showHistoryDetail(session) {
    currentSessionData = session;
    showScreen(document.getElementById('history-detail-screen'));
    document.getElementById('detail-title').innerText = `${session.round}회차 오답 노트`;
    const container = document.getElementById('history-detail-list');
    container.innerHTML = '';
    
    session.wrongList.forEach(w => {
        const div = document.createElement('div');
        div.className = 'wrong-item';
        div.innerHTML = `
            <div class="wrong-title"><span style="color:#007aff;">[${w.category}]</span> ${w.title}</div>
            <div class="wrong-detail" style="color:#dc3545;">❌ 내 선택: ${w.user}</div>
            <div class="wrong-detail" style="color:#28a745; margin-bottom:10px;">✅ 정답: ${w.correct}</div>
            <div class="wrong-exp">💡 <strong>해설:</strong><br>${w.exp}</div>
        `;
        container.appendChild(div);
    });
}

function showMainScreen() { showScreen(document.getElementById('start-screen')); }
function showScreen(screen) {
    document.querySelectorAll('#app > section').forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function downloadTxt(session) {
    let content = `[NHN 오답노트] ${session.round}회차\n점수: ${session.score}\n\n`;
    session.wrongList.forEach((w, i) => {
        content += `[문제 ${i+1}] ${w.title}\n❌ 선택: ${w.user}\n✅ 정답: ${w.correct}\n💡 해설:\n${w.exp}\n\n================\n\n`;
    });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = `오답노트_${session.round}회차.txt`;
    a.click();
}
