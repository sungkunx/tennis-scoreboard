// 네비게이션 관련 기능들

// 홈으로 가기 확인
function confirmGoHome() {
    const currentScreen = getCurrentScreen();
    
    // Step1, Step2, 대진표 화면에서는 경고 표시
    if (['step1-screen', 'step2-screen', 'bracket-screen'].includes(currentScreen)) {
        if (confirm('입력된 내용이 삭제될 수 있습니다. 홈으로 돌아가시겠습니까?')) {
            // 임시 모임 데이터 초기화
            appState.tempMeeting = null;
            showMainScreen();
        }
    } else {
        showMainScreen();
    }
}

// 현재 화면 식별
function getCurrentScreen() {
    const screens = ['main-screen', 'step1-screen', 'step2-screen', 'bracket-screen', 'game-screen'];
    
    for (let screenId of screens) {
        const screen = document.getElementById(screenId);
        if (screen && !screen.classList.contains('hidden')) {
            return screenId;
        }
    }
    
    return 'main-screen';
}