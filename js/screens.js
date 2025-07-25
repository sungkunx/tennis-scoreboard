// 화면 전환 관련 기능들

// 메인 화면 표시
function showMainScreen() {
    hideAllScreens();
    document.getElementById('main-screen').classList.remove('hidden');
    loadMeetings();
}

// Step1 화면 표시
function showStep1() {
    hideAllScreens();
    document.getElementById('step1-screen').classList.remove('hidden');
    
    const memberList = document.getElementById('member-list');
    if (!memberList.children.length) {
        initializeMembers();
    }
}

// Step2 화면 표시
function showStep2() {
    hideAllScreens();
    document.getElementById('step2-screen').classList.remove('hidden');
    
    // 모임 요약 표시
    displayMeetingSummary();
    updateGameCountInfo();
}

// 대진표 화면 표시
function showBracketScreen() {
    hideAllScreens();
    document.getElementById('bracket-screen').classList.remove('hidden');
    displayBracket();
}

// 게임 화면 표시
function showGameScreen() {
    hideAllScreens();
    document.getElementById('game-screen').classList.remove('hidden');
    initializeGameScreen();
}

// 모든 화면 숨김
function hideAllScreens() {
    document.querySelectorAll('[id$="-screen"]').forEach(screen => {
        screen.classList.add('hidden');
    });
}