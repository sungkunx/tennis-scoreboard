// 온라인 모드 관련 기능들

// 온라인 모드 상태 확장 (이미 app.js에서 기본 초기화됨)
if (!appState.onlineMode.hasOwnProperty('connected')) {
    appState.onlineMode.connected = false;
}

// 온라인 모드 활성화 시작
function activateOnlineMode() {
    showServiceCodeModal();
}

// 서비스 코드 입력 모달
function showServiceCodeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>온라인 모드 활성화</h3>
                <button class="modal-close" onclick="closeServiceCodeModal()">×</button>
            </div>
            
            <div class="modal-body">
                <p>이 서비스는 관련된 사람만 사용할 수 있습니다.</p>
                <p>서비스 이용 코드를 입력해주세요:</p>
                <input type="password" id="service-code-input" class="form-input" placeholder="서비스 코드 입력" style="margin-top: 15px;">
                <div id="service-code-error" class="error-message" style="display: none; color: red; margin-top: 10px;"></div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeServiceCodeModal()">취소</button>
                <button class="btn-primary" onclick="verifyServiceCode()">확인</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Enter 키 이벤트 추가
    document.getElementById('service-code-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyServiceCode();
        }
    });
}

// 서비스 코드 확인
function verifyServiceCode() {
    const code = document.getElementById('service-code-input').value;
    const errorDiv = document.getElementById('service-code-error');
    
    if (code === 'cho') {
        closeServiceCodeModal();
        showAccessCodeModal();
    } else {
        errorDiv.style.display = 'block';
        errorDiv.textContent = '잘못된 서비스 코드입니다.';
        document.getElementById('service-code-input').value = '';
    }
}

// 서비스 코드 모달 닫기
function closeServiceCodeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 접속 코드 입력 모달
function showAccessCodeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>접속 코드 입력</h3>
                <button class="modal-close" onclick="closeAccessCodeModal()">×</button>
            </div>
            
            <div class="modal-body">
                <p>당신의 온라인 모드 키워드를 입력하시오:</p>
                <input type="text" id="access-code-input" class="form-input" placeholder="접속 코드 입력" style="margin-top: 15px;">
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    * 같은 접속 코드를 사용하는 사람들끼리 데이터를 공유합니다
                </p>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeAccessCodeModal()">취소</button>
                <button class="btn-primary" onclick="confirmAccessCode()">확인</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Enter 키 이벤트 추가
    document.getElementById('access-code-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmAccessCode();
        }
    });
}

// 접속 코드 확인
function confirmAccessCode() {
    const accessCode = document.getElementById('access-code-input').value.trim();
    
    if (!accessCode) {
        alert('접속 코드를 입력해주세요.');
        return;
    }
    
    // Firebase 초기화 시도
    if (!isFirebaseConnected()) {
        if (!initializeFirebase()) {
            alert('온라인 모드 연결에 실패했습니다. 오프라인 모드로 계속 진행합니다.');
            closeAccessCodeModal();
            return;
        }
    }
    
    // 온라인 모드 활성화
    appState.onlineMode.active = true;
    appState.onlineMode.accessCode = accessCode;
    appState.onlineMode.connected = true;
    appState.mode = 'online';
    
    closeAccessCodeModal();
    
    // UI 업데이트
    updateOnlineModeUI();
    
    // 기존 오프라인 데이터를 온라인으로 업로드
    uploadOfflineDataToOnline();
    
    // 온라인 데이터 로드
    loadOnlineData();
}

// 접속 코드 모달 닫기
function closeAccessCodeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 온라인 모드 UI 업데이트
function updateOnlineModeUI() {
    // 모드 버튼 업데이트
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 온라인 모드 버튼 텍스트 변경
    const onlineBtn = document.querySelector('.mode-btn:last-child');
    if (onlineBtn) {
        onlineBtn.classList.add('active');
        onlineBtn.textContent = '온라인 모드 (활성화됨)';
    }
    
    // 상태 바 업데이트 - 온라인 모드
    updateStatusBar('online', appState.onlineMode.accessCode);
    
    // 접속 코드 표시 영역 추가
    showAccessCodeInfo();
    
    // 코드 입력 섹션 숨김
    const onlineCodeSection = document.getElementById('online-code');
    if (onlineCodeSection) {
        onlineCodeSection.classList.remove('show');
    }
}

// 접속 코드 정보 표시
function showAccessCodeInfo() {
    const header = document.querySelector('#main-screen .header');
    
    // 기존 접속 코드 정보 제거
    const existingInfo = document.getElementById('access-code-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // 새 접속 코드 정보 추가
    const accessCodeInfo = document.createElement('div');
    accessCodeInfo.id = 'access-code-info';
    accessCodeInfo.className = 'access-code-info';
    accessCodeInfo.innerHTML = `
        <div class="access-code-display">
            <span>접속 코드: <strong>${appState.onlineMode.accessCode}</strong></span>
            <button class="delete-access-code-btn" onclick="confirmDeleteAccessCode()">접속 코드 삭제</button>
        </div>
    `;
    
    header.appendChild(accessCodeInfo);
}

// 접속 코드 삭제 확인
function confirmDeleteAccessCode() {
    if (confirm('접속 코드를 삭제하면 서버의 모든 관련 데이터가 삭제됩니다.\n정말 삭제하시겠습니까?')) {
        deleteAccessCodeData();
    }
}

// 접속 코드 데이터 삭제
function deleteAccessCodeData() {
    if (!isFirebaseConnected() || !appState.onlineMode.accessCode) {
        return;
    }
    
    const accessCode = appState.onlineMode.accessCode;
    
    // Firebase에서 데이터 삭제
    database.ref('accessCodes/' + accessCode).remove()
        .then(() => {
            alert('접속 코드가 삭제되었습니다.');
            
            // 온라인 모드 비활성화
            deactivateOnlineMode();
        })
        .catch((error) => {
            console.error('데이터 삭제 실패:', error);
            alert('데이터 삭제에 실패했습니다.');
        });
}

// 온라인 모드 비활성화
function deactivateOnlineMode() {
    appState.onlineMode.active = false;
    appState.onlineMode.accessCode = null;
    appState.onlineMode.connected = false;
    appState.mode = 'offline';
    
    // 상태 바 업데이트 - 오프라인 모드
    updateStatusBar('offline');
    
    // UI 초기화
    const accessCodeInfo = document.getElementById('access-code-info');
    if (accessCodeInfo) {
        accessCodeInfo.remove();
    }
    
    // 모드 버튼 초기화
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const offlineBtn = document.querySelector('.mode-btn:first-child');
    if (offlineBtn) {
        offlineBtn.classList.add('active');
    }
    
    const onlineBtn = document.querySelector('.mode-btn:last-child');
    if (onlineBtn) {
        onlineBtn.textContent = '온라인 모드';
    }
    
    // 모임 목록 다시 로드
    loadMeetings();
}

// 오프라인 데이터를 온라인으로 업로드
function uploadOfflineDataToOnline() {
    if (!isFirebaseConnected() || !appState.onlineMode.accessCode || appState.meetings.length === 0) {
        return;
    }
    
    const accessCode = appState.onlineMode.accessCode;
    const uploadData = {
        meetings: appState.meetings,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Firebase에 데이터 업로드
    database.ref('accessCodes/' + accessCode).set(uploadData)
        .then(() => {
            console.log('오프라인 데이터 업로드 완료');
        })
        .catch((error) => {
            console.error('데이터 업로드 실패:', error);
        });
}

// 온라인 데이터 로드
function loadOnlineData() {
    if (!isFirebaseConnected() || !appState.onlineMode.accessCode) {
        return;
    }
    
    console.log('🔄 오프라인에서 온라인 모드로 전환: 온라인 데이터 로드');
    const accessCode = appState.onlineMode.accessCode;
    
    database.ref('accessCodes/' + accessCode).once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data && data.meetings) {
                appState.meetings = data.meetings;
                console.log('☁️ 온라인 데이터 로드 완료:', appState.meetings.length + '개 모임');
                loadMeetings();
            } else {
                console.log('☁️ 저장된 온라인 데이터 없음');
                appState.meetings = [];
                loadMeetings();
            }
        })
        .catch((error) => {
            console.error('데이터 로드 실패:', error);
        });
}

// 온라인 모드 활성화 완료 (접속코드 변경 시 사용)
function completeOnlineActivation(accessCode) {
    // Firebase 초기화 시도
    if (!isFirebaseConnected()) {
        if (!initializeFirebase()) {
            alert('온라인 모드 연결에 실패했습니다.');
            return;
        }
    }
    
    // 온라인 모드 활성화
    appState.onlineMode.active = true;
    appState.onlineMode.accessCode = accessCode;
    appState.onlineMode.connected = true;
    appState.mode = 'online';
    
    // UI 업데이트
    updateOnlineModeUI();
    
    // 기존 오프라인 데이터를 온라인으로 업로드
    uploadOfflineDataToOnline();
    
    // 온라인 데이터 로드
    loadOnlineData();
}

// 온라인 모드에서 데이터 저장
function saveToOnline(data) {
    if (!isFirebaseConnected() || !appState.onlineMode.accessCode) {
        return Promise.resolve();
    }
    
    const accessCode = appState.onlineMode.accessCode;
    const saveData = {
        meetings: data || appState.meetings,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    };
    
    return database.ref('accessCodes/' + accessCode).set(saveData);
}

// 상태 바 업데이트 함수
function updateStatusBar(mode, accessCode = null) {
    const statusBar = document.getElementById('status-bar');
    const statusText = document.querySelector('.status-text');
    const statusCode = document.getElementById('status-code');
    
    if (!statusBar || !statusText || !statusCode) return;
    
    if (mode === 'online') {
        statusBar.classList.add('online');
        statusText.textContent = '온라인';
        statusCode.textContent = accessCode ? `코드: ${accessCode}` : '';
    } else {
        statusBar.classList.remove('online');
        statusText.textContent = '오프라인';
        statusCode.textContent = '';
    }
}