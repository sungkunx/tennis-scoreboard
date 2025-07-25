// 전역 상태 관리
let appState = {
    mode: 'offline',
    meetings: JSON.parse(localStorage.getItem('tennis-meetings') || '[]'),
    currentMeeting: null,
    tempMeeting: null
};

// 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadMeetings();
    initializeMembers();
    updateGameCountInfo();
    
    // 이벤트 리스너 추가
    document.addEventListener('change', function(e) {
        if (e.target.id === 'court-count' || e.target.id === 'time-count') {
            updateGameCountInfo();
        }
    });
});

// 모드 설정
function setMode(mode) {
    if (mode === 'online') {
        // 온라인 모드가 이미 활성화되어 있지 않다면 활성화 프로세스 시작
        if (!appState.onlineMode.active) {
            activateOnlineMode();
            return;
        }
    } else {
        // 오프라인 모드로 전환 (온라인 모드 비활성화하지 않음)
        appState.mode = 'offline';
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        const onlineCode = document.getElementById('online-code');
        onlineCode.classList.remove('show');
    }
}

// 온라인 코드 확인
function verifyCode() {
    const code = document.getElementById('code-input').value;
    if (code === 'chochocho') {
        alert('온라인 모드가 활성화되었습니다.');
        // TODO: Firebase 연결 로직
    } else {
        alert('잘못된 코드입니다.');
        document.getElementById('code-input').value = '';
    }
}