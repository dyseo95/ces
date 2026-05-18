let currentExamQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let isPracticeMode = false;
let currentSessionData = null;

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
    
    document.getElementById('prevBtn').addEventListener('click', goPrev);
    document.getElementById('nextBtn').addEventListener('click', goNext);
    document.getElementById('checkAnswerBtn').addEventListener('click', checkAnswer);
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
    let count = 30; // 기본값
    
    if (countBtn) {
        const val = countBtn.getAttribute('data-count');
        if (val === 'all') {
            count = window.questions.length;
        } else {
            count = parseInt(val);
            if (isNaN(count)) {
                count = window.questions.length;
            }
        }
    }

    if (count > window.questions.length) {
        count = window.questions.length;
    }

    currentExamQuestions = [...window.questions].sort(() => Math.random() - 0.5).slice(0, count);
    currentIndex = 0;
    userAnswers = new Array(count).fill(null);

    showScreen(document.getElementById('exam-screen'));
    const badge = document.getElementById('mode-badge');
    badge.innerText = isPracticeMode ? "🎓 연습 모드" : "📝 실전 모드";
    badge.className = isPracticeMode ? 'badge practice-badge' : 'badge real-badge';
    renderQuestion();
}

function renderQuestion() {
    const q = currentExamQuestions[currentIndex];
    document.getElementById('progress').innerText = `문제 ${currentIndex + 1} / ${currentExamQuestions.length}`;
    document.getElementById('question-title').innerHTML = q.title;
    
    document.getElementById('practice-feedback').classList.add('hidden');
    document.getElementById('checkAnswerBtn').classList.add('hidden');
    
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.classList.remove('hidden');
    
    const optionsList = document.getElementById('options');
    optionsList.innerHTML = '';

    q.options.forEach(opt => {
        const li = document.createElement('li');
        li.innerText = opt;
        if (userAnswers[currentIndex] === opt) li.classList.add('selected');
        li.onclick = () => selectOption(li, opt);
        optionsList.appendChild(li);
    });

    document.getElementById('prevBtn').style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
    
    if (isPracticeMode) {
        const isChecked = document.querySelector('.practice-correct') || document.querySelector('.practice-wrong');
        if (userAnswers[currentIndex] && !isChecked) { 
             document.getElementById('checkAnswerBtn').classList.remove('hidden');
             nextBtn.classList.add('hidden');
        } else if (isChecked) {
             nextBtn.classList.remove('hidden');
        } else {
             document.getElementById('checkAnswerBtn').classList.remove('hidden');
             nextBtn.classList.add('hidden');
        }
    } else {
        nextBtn.innerText = (currentIndex === currentExamQuestions.length - 1) ? '최종 제출' : '다음';
    }
}

function selectOption(liElement, opt) {
    if (isPracticeMode && !document.getElementById('practice-feedback').classList.contains('hidden')) return;
    userAnswers[currentIndex] = opt;
    document.querySelectorAll('#options li').forEach(el => el.classList.remove('selected'));
    liElement.classList.add('selected');
}

function checkAnswer() {
    const q = currentExamQuestions[currentIndex];
    const myAns = userAnswers[currentIndex];
    if (!myAns) return alert("답을 선택해주세요.");

    const options = document.querySelectorAll('#options li');
    const isCorrect = (myAns === q.answer);

    options.forEach(li => {
        if (li.innerText === q.answer) li.classList.add('practice-correct');
        if (li.innerText === myAns && !isCorrect) li.classList.add('practice-wrong');
    });

    const msgBox = document.getElementById('feedback-msg');
    const expBox = document.getElementById('feedback-explanation');
    msgBox.innerHTML = isCorrect ? "<div class='msg-correct'>✅ 정답입니다!</div>" : "<div class='msg-wrong'>❌ 틀렸습니다.</div>";
    expBox.innerHTML = q.explanation;
    
    document.getElementById('practice-feedback').classList.remove('hidden');
    document.getElementById('checkAnswerBtn').classList.add('hidden');
    document.getElementById('nextBtn').classList.remove('hidden');
}

function goNext() {
    if (currentIndex < currentExamQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        finishExam();
    }
}

function goPrev() {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
    }
}

function finishExam() {
    if (!confirm("결과를 확인하시겠습니까?")) return;
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

// ★ 개별 삭제 버튼 조작을 위해 전면 전개 및 업데이트된 오답노트 리스트 출력 함수
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
        // 오답노트 박스 내 레이아웃 분리 및 우측 삭제 버튼 배치
        item.innerHTML = `
            <div class="session-info">
                <span class="session-title" style="font-weight:bold;">[${session.mode}] ${session.round}회차 (${session.date})</span>
                <span class="session-score" style="color:#007aff; font-weight:bold; margin-left:15px;">${session.score} 정답</span>
            </div>
            <button class="btn-delete-single" style="background:#fff; border:1px solid #ff4d4f; color:#ff4d4f; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.85rem; font-weight:bold;">삭제</button>
        `;
        
        // 박스 자체를 누르면 상세 보기로 이동
        item.onclick = () => showHistoryDetail(session);
        
        // [삭제] 버튼 클릭 시 해당 기록만 지우는 로직 (이벤트 전파 방지 적용)
        const delBtn = item.querySelector('.btn-delete-single');
        delBtn.onclick = (e) => {
            e.stopPropagation(); // 중요: 상세 페이지가 열리는 이벤트를 중간에 차단!
            if (confirm(`${session.round}회차 기록을 보관함에서 삭제하시겠습니까?`)) {
                deleteSingleHistory(session.id);
            }
        };
        
        container.appendChild(item);
    });
}

// ★ 특정 오답노트 기록만 골라내어 삭제하는 새로운 함수
function deleteSingleHistory(sessionId) {
    let sessions = JSON.parse(localStorage.getItem('nhn_exam_sessions')) || [];
    // 선택한 세션 ID를 제외한 데이터들만 남기기
    sessions = sessions.filter(session => session.id !== sessionId);
    localStorage.setItem('nhn_exam_sessions', JSON.stringify(sessions));
    showHistoryList(); // 목록 새로고침
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
