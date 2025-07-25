// 전역 상태 관리
let appState = {
    mode: 'offline',
    meetings: JSON.parse(localStorage.getItem('tennis-meetings') || '[]'),
    currentMeeting: null,
    tempMeeting: null,
    onlineMode: {
        active: false,
        accessCode: null
    }
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
        // 온라인 모드가 이미 활성화되어 있다면 접속코드 변경 확인
        if (appState.onlineMode && appState.onlineMode.active) {
            const currentCode = appState.onlineMode.accessCode || '알 수 없음';
            if (confirm(`현재 접속코드: ${currentCode}\n\n다른 접속코드로 변경하시겠습니까?`)) {
                showOnlineCodeChangeModal();
            }
            return;
        } else {
            // 온라인 모드가 비활성화 상태면 활성화 프로세스 시작
            activateOnlineMode();
            return;
        }
    } else {
        // 오프라인 모드로 전환
        if (appState.onlineMode && appState.onlineMode.active) {
            // 온라인 모드에서 오프라인으로 전환 시 확인
            const currentCode = appState.onlineMode.accessCode || '알 수 없음';
            if (confirm(`${currentCode} 모임을 나가서 오프라인 모드로 진행합니다.\n\n계속하시겠습니까?`)) {
                // 온라인 모드 비활성화
                deactivateOnlineMode();
                switchToOfflineMode();
            }
            return;
        } else {
            // 이미 오프라인 모드면 그냥 전환
            switchToOfflineMode();
        }
    }
}

// 오프라인 모드로 전환
function switchToOfflineMode() {
    appState.mode = 'offline';
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.mode-btn[onclick="setMode(\'offline\')"]').classList.add('active');
    
    const onlineCode = document.getElementById('online-code');
    onlineCode.classList.remove('show');
    
    // 모임 목록 새로고침
    loadMeetings();
}

// 온라인 접속코드 변경 모달 표시
function showOnlineCodeChangeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>접속코드 변경</h3>
                <button class="modal-close" onclick="closeOnlineCodeChangeModal()">×</button>
            </div>
            
            <div class="modal-body">
                <p>새로운 접속코드를 입력하세요:</p>
                <input type="password" class="code-input" id="new-code-input" placeholder="새 접속코드 입력">
                <div class="error-message" id="code-change-error" style="color: red; display: none;"></div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeOnlineCodeChangeModal()">취소</button>
                <button class="btn-primary" onclick="changeAccessCode()">변경</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 입력 필드에 포커스
    setTimeout(() => {
        document.getElementById('new-code-input').focus();
    }, 100);
}

// 온라인 접속코드 변경 모달 닫기
function closeOnlineCodeChangeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 접속코드 변경 실행
function changeAccessCode() {
    const newCode = document.getElementById('new-code-input').value.trim();
    const errorDiv = document.getElementById('code-change-error');
    
    if (!newCode) {
        errorDiv.textContent = '접속코드를 입력해주세요.';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (newCode === 'chochocho') {
        // 기존 온라인 모드 비활성화
        deactivateOnlineMode();
        
        // 새 접속코드로 활성화
        completeOnlineActivation(newCode);
        
        // 모달 닫기
        closeOnlineCodeChangeModal();
        
        alert('접속코드가 변경되었습니다.');
    } else {
        errorDiv.textContent = '잘못된 접속코드입니다.';
        errorDiv.style.display = 'block';
        document.getElementById('new-code-input').value = '';
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