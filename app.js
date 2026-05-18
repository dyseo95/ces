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
    if (!window.questions || window.questions.length === 0) return alert("문제 데이터가 없습니다.");
    isPracticeMode = practiceMode;
    const countBtn = document.querySelector('.count-select button.active');
    const count = countBtn ? parseInt(countBtn.dataset.count) : 30;

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
            <div class="session-info"><span class="session-title" style="font-weight:bold;">[${session.mode}] ${session.round}회차 (${session.date})</span></div>
            <span class="session-score" style="color:#007aff; font-weight:bold;">${session.score} 정답</span>
        `;
        item.onclick = () => showHistoryDetail(session);
        container.appendChild(item);
    });
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
