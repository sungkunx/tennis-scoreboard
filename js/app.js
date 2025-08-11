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
    // URL 파라미터에서 접속 코드 확인
    checkForSharedAccessCode();
    
    loadMeetings();
    initializeMembers();
    updateGameCountInfo();
    
    // 이벤트 리스너 추가
    document.addEventListener('change', function(e) {
        if (e.target.id === 'court-count' || e.target.id === 'time-count') {
            updateGameCountInfo();
        }
    });
    
    // 대진표 카드 클릭 이벤트 리스너 추가 (이벤트 위임)
    document.addEventListener('click', function(e) {
        const bracketCard = e.target.closest('.bracket-card');
        if (bracketCard && bracketCard.dataset.bracketType) {
            console.log('Bracket card clicked:', bracketCard.dataset.bracketType);
            selectBracketType(bracketCard.dataset.bracketType);
        }
    });
});

// URL 파라미터에서 공유된 접속 코드 및 모임 정보 확인
function checkForSharedAccessCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCode = urlParams.get('code');
    const meetingId = urlParams.get('meeting');
    
    if (sharedCode) {
        console.log('🔗 공유된 접속 코드 감지:', sharedCode);
        if (meetingId) {
            console.log('📝 공유된 모임 ID 감지:', meetingId);
        }
        
        // URL에서 파라미터 제거 (히스토리 보존)
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // 접속 코드를 입력창에 미리 채워넣기
        setTimeout(() => {
            prefillAccessCode(sharedCode, meetingId);
        }, 500); // 약간의 지연을 두어 UI가 준비되도록 함
    }
}

// 접속 코드 미리 채우기 및 모임 자동 이동
function prefillAccessCode(accessCode, meetingId) {
    console.log('📝 접속 코드 미리 채우기:', accessCode);
    
    // 온라인 모드 활성화 (UI만)
    setMode('online');
    
    // 접속 코드 입력창에 값 설정
    const codeInput = document.getElementById('code-input');
    if (codeInput) {
        codeInput.value = accessCode;
        
        if (meetingId) {
            // 모임 ID가 있는 경우: 자동 연결 (더 긴 지연시간)
            showAutoConnectFeedback('공유된 게임에 자동 연결 중...', 'loading');
            window.pendingMeetingId = meetingId;
            // UI가 완전히 준비될 때까지 충분히 대기
            setTimeout(() => {
                console.log('🚀 자동 연결 시작 - 대기 중인 모임 ID:', window.pendingMeetingId);
                verifyCodeAndConnect(accessCode, true);
            }, 2000); // 2초로 증가
        } else {
            // 모임 ID가 없는 경우: 수동 연결
            showAutoConnectFeedback('공유된 링크로 접속하셨습니다. 연결 버튼을 클릭해주세요.', 'info');
        }
    }
}

// 자동 온라인 모드 연결 시도
function attemptAutoOnlineConnection(accessCode) {
    if (appState.onlineMode.active && appState.onlineMode.accessCode === accessCode) {
        console.log('✅ 이미 동일한 코드로 연결됨');
        showAutoConnectFeedback('이미 연결된 상태입니다', 'info');
        return;
    }
    
    console.log('🔄 자동 온라인 모드 연결 시도 중...');
    showAutoConnectFeedback('공유된 게임에 연결 중...', 'loading');
    
    // 온라인 모드 활성화
    setMode('online');
    
    // 접속 코드 입력 및 검증
    const codeInput = document.getElementById('code-input');
    if (codeInput) {
        codeInput.value = accessCode;
        
        // 자동으로 연결 시도
        setTimeout(() => {
            verifyCodeAndConnect(accessCode, true);
        }, 1000);
    }
}

// 자동 연결 피드백 표시
function showAutoConnectFeedback(message, type = 'info') {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `auto-connect-feedback ${type}`;
    feedbackDiv.textContent = message;
    
    // 기존 피드백 제거
    const existingFeedback = document.querySelector('.auto-connect-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // 상태바 아래에 피드백 추가
    document.body.insertBefore(feedbackDiv, document.body.firstChild.nextSibling);
    
    // 자동으로 제거 (로딩 타입이 아닌 경우)
    if (type !== 'loading') {
        setTimeout(() => {
            if (feedbackDiv.parentNode) {
                feedbackDiv.remove();
            }
        }, 4000);
    }
}

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
    
    // 상태 바 업데이트 - 오프라인 모드
    updateStatusBar('offline');
    
    const onlineCode = document.getElementById('online-code');
    onlineCode.classList.remove('show');
    
    // 온라인 데이터를 오프라인 데이터로 교체
    console.log('🔄 온라인에서 오프라인 모드로 전환: 로컬 데이터 로드');
    const offlineData = localStorage.getItem('tennis-meetings');
    if (offlineData) {
        appState.meetings = JSON.parse(offlineData);
        console.log('📂 오프라인 데이터 로드 완료:', appState.meetings.length + '개 모임');
    } else {
        appState.meetings = [];
        console.log('📂 저장된 오프라인 데이터 없음');
    }
    
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
                <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                    * 다른 모임의 접속코드를 입력하면 해당 모임으로 이동합니다<br>
                    * 새로운 접속코드를 입력하면 새 모임 공간이 생성됩니다
                </p>
                <input type="text" class="code-input" id="new-code-input" placeholder="예: meeting123, room456">
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
    
    // 접속코드는 서비스 이용 코드 검증 없이 바로 변경
    // (이미 온라인 모드에 있으므로 서비스 이용 권한은 검증됨)
    console.log('🔄 접속코드 변경:', appState.onlineMode.accessCode, '→', newCode);
    
    // 기존 온라인 모드 비활성화
    deactivateOnlineMode();
    
    // 새 접속코드로 활성화 (서비스 코드 검증 건너뛰기)
    completeOnlineActivation(newCode);
    
    // 모달 닫기
    closeOnlineCodeChangeModal();
    
    alert(`접속코드가 '${newCode}'로 변경되었습니다.`);
}

// 온라인 코드 확인
function verifyCode() {
    const code = document.getElementById('code-input').value;
    verifyCodeAndConnect(code, false);
}

// 코드 검증 및 연결 (자동/수동 모드 통합)
function verifyCodeAndConnect(code, isAutoConnect = false) {
    if (!code || code.trim() === '') {
        if (!isAutoConnect) {
            alert('접속 코드를 입력해주세요.');
        }
        return;
    }
    
    // 기존 피드백 제거
    const existingFeedback = document.querySelector('.auto-connect-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // 간단한 코드 검증 (실제로는 Firebase에서 검증)
    if (code.length >= 3) {
        // 온라인 모드 상태 업데이트
        appState.onlineMode.active = true;
        appState.onlineMode.accessCode = code;
        
        // UI 업데이트
        updateOnlineModeUI();
        
        if (isAutoConnect) {
            showAutoConnectFeedback('✅ 공유된 게임에 성공적으로 연결되었습니다!', 'success');
        } else {
            alert('온라인 모드가 활성화되었습니다.');
        }
        
        console.log('✅ 온라인 모드 연결 성공:', code);
        
        // 대기 중인 모임 ID가 있으면 해당 모임으로 이동
        if (window.pendingMeetingId) {
            console.log('🎯 연결 성공! 모임 이동 준비:', window.pendingMeetingId);
            // 연결이 완전히 완료된 후 모임으로 이동
            setTimeout(() => {
                attemptAutoMeetingNavigation(window.pendingMeetingId);
                window.pendingMeetingId = null; // 사용 후 제거
            }, 1500); // 1.5초로 증가
        }
        
        // TODO: Firebase 실제 연결 로직 구현
        
    } else {
        if (isAutoConnect) {
            showAutoConnectFeedback('❌ 유효하지 않은 공유 링크입니다', 'error');
        } else {
            alert('잘못된 코드입니다.');
            document.getElementById('code-input').value = '';
        }
        
        console.log('❌ 코드 검증 실패:', code);
    }
}

// 온라인 모드 UI 업데이트
function updateOnlineModeUI() {
    // 상태바 업데이트
    const statusBar = document.getElementById('status-bar');
    const statusText = statusBar.querySelector('.status-text');
    const statusCode = document.getElementById('status-code');
    
    if (appState.onlineMode.active) {
        statusBar.classList.add('online');
        if (statusText) statusText.textContent = '온라인';
        if (statusCode) statusCode.textContent = `코드: ${appState.onlineMode.accessCode}`;
    } else {
        statusBar.classList.remove('online');
        if (statusText) statusText.textContent = '오프라인';
        if (statusCode) statusCode.textContent = '';
    }
    
    // 모드 버튼 상태 업데이트
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeMode = appState.onlineMode.active ? 'online' : 'offline';
    const activeBtn = document.querySelector(`.mode-btn[onclick="setMode('${activeMode}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// 공유된 모임으로 자동 이동 시도
function attemptAutoMeetingNavigation(meetingId) {
    console.log('🎯 모임 자동 이동 시도:', meetingId);
    console.log('🔍 현재 온라인 모드 상태:', appState.onlineMode);
    
    // 1단계: 로컬 스토리지에서 모임 찾기
    const meetings = JSON.parse(localStorage.getItem('tennis-meetings') || '[]');
    const localMeeting = meetings.find(meeting => meeting.id === meetingId);
    
    if (localMeeting) {
        console.log('✅ 로컬에서 모임 발견:', localMeeting.name);
        proceedWithMeeting(localMeeting);
        return;
    }
    
    // 2단계: 로컬에 없으면 온라인에서 찾기 시도
    console.log('🔍 온라인에서 모임 정보 검색 중...');
    showAutoConnectFeedback('공유된 게임 정보를 가져오는 중...', 'loading');
    
    // Firebase에서 모임 정보 가져오기 (TODO: 실제 구현)
    // 현재는 메인 화면으로 이동하고 알림만 표시
    setTimeout(() => {
        console.log('💡 온라인 모드로 접속했지만 로컬에 모임 정보가 없음');
        showAutoConnectFeedback('온라인 모드로 연결되었습니다. 모임 생성자가 현재 상태를 공유할 때까지 대기해주세요.', 'info');
    }, 2000);
}

// 모임 처리 로직 분리
function proceedWithMeeting(targetMeeting) {
    console.log('✅ 모임 발견:', targetMeeting.name, '상태:', targetMeeting.status);
    
    // 모임 상태에 따른 처리
    if (targetMeeting.status === 'in-progress') {
        // 진행중인 모임: 게임 화면으로 이동
        appState.currentMeeting = targetMeeting;
        showAutoConnectFeedback(`"${targetMeeting.name}" 게임에 참여합니다!`, 'success');
        
        setTimeout(() => {
            showScreen('game-screen');
            initializeGameScreen();
        }, 1500);
        
    } else {
        // 설정중인 모임: 메인 화면에 표시 (이미 표시됨)
        showAutoConnectFeedback(`"${targetMeeting.name}" 모임 정보를 확인하세요.`, 'info');
        
        // 해당 모임 카드를 하이라이트
        setTimeout(() => {
            highlightMeetingCard(meetingId);
        }, 1500);
    }
}

// 모임 카드 하이라이트
function highlightMeetingCard(meetingId) {
    const meetingCards = document.querySelectorAll('.meeting-card');
    meetingCards.forEach(card => {
        if (card.dataset.meetingId === meetingId) {
            card.style.border = '2px solid #007bff';
            card.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 3초 후 하이라이트 제거
            setTimeout(() => {
                card.style.border = '';
                card.style.boxShadow = '';
            }, 3000);
        }
    });
}

// 대진표 카드 선택 (전역 함수)
function selectBracketType(type) {
    console.log('selectBracketType called with:', type);
    
    // 모든 카드에서 active 클래스 제거
    document.querySelectorAll('.bracket-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // 선택된 카드에 active 클래스 추가
    const selectedCard = document.querySelector(`[data-bracket-type="${type}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        console.log('Card activated:', selectedCard);
    } else {
        console.error('Card not found for type:', type);
    }
    
    // 라디오 버튼 체크
    const radioButton = document.querySelector(`input[name="bracket-type"][value="${type}"]`);
    if (radioButton) {
        radioButton.checked = true;
        console.log('Radio button checked:', radioButton);
    } else {
        console.error('Radio button not found for type:', type);
    }
    
    // 기존 핸들러 호출
    handleBracketTypeChange();
}