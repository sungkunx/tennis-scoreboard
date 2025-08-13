// 공유 링크 관리 시스템

// 서버에 공유 링크 생성
async function generateServerShareLink(meeting) {
    if (!appState.onlineMode.active || !meeting.id) {
        console.error('❌ 온라인 모드가 비활성화되었거나 모임 ID가 없습니다');
        return null;
    }

    // Firebase 초기화 확인
    if (!isFirebaseConnected()) {
        console.error('❌ Firebase가 연결되지 않았습니다');
        return null;
    }

    try {
        let shareId;
        let attempts = 0;
        const maxAttempts = 5;

        // 고유한 shareId 생성 (중복 체크)
        do {
            shareId = generateShortId();
            attempts++;
            
            if (attempts > maxAttempts) {
                throw new Error('고유 ID 생성 실패');
            }
            
            // Firebase에서 중복 체크
            const existingSnapshot = await database.ref('shareLinks/' + shareId).once('value');
            if (!existingSnapshot.exists()) {
                break; // 중복되지 않는 ID 찾음
            }
        } while (true);

        // 30일 후 만료 설정
        const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

        // Firebase에 링크 정보 저장 (접속 코드는 소문자로 정규화)
        const linkData = {
            accessCode: appState.onlineMode.accessCode.toLowerCase(),
            meetingId: meeting.id,
            meetingName: meeting.name,
            createdAt: Date.now(),
            expiresAt: expiresAt,
            clicks: 0
        };

        await database.ref('shareLinks/' + shareId).set(linkData);

        // 공유 링크 생성
        const shareUrl = `${window.location.origin}${window.location.pathname}#share/${shareId}`;
        
        console.log('✅ 공유 링크 생성 완료:', shareUrl);
        return shareUrl;

    } catch (error) {
        console.error('❌ 공유 링크 생성 실패:', error);
        return null;
    }
}

// 공유 링크 클립보드 복사
async function copyMeetingShareLink(meeting) {
    try {
        // 로딩 피드백 표시
        showCopyFeedback(meeting.id, '링크 생성 중...', 'loading');
        
        // 서버에 링크 생성
        const shareUrl = await generateServerShareLink(meeting);
        
        if (!shareUrl) {
            showCopyFeedback(meeting.id, '링크 생성 실패', 'error');
            return;
        }

        // 클립보드에 복사
        await navigator.clipboard.writeText(shareUrl);
        
        // 성공 피드백
        showCopyFeedback(meeting.id, '링크 복사됨!', 'success');
        
        console.log('📋 공유 링크 클립보드 복사 완료:', shareUrl);

    } catch (error) {
        console.error('❌ 링크 복사 실패:', error);
        
        // Clipboard API 지원하지 않는 경우 대체 방법
        const shareUrl = await generateServerShareLink(meeting);
        if (shareUrl) {
            prompt('링크를 수동으로 복사해주세요:', shareUrl);
        }
        
        showCopyFeedback(meeting.id, '수동 복사 필요', 'warning');
    }
}

// 복사 피드백 표시
function showCopyFeedback(meetingId, message, type) {
    const button = document.querySelector(`[data-meeting-id="${meetingId}"] .copy-link-btn`);
    if (!button) return;

    const originalText = button.textContent;
    const originalClass = button.className;

    // 피드백 표시
    button.textContent = message;
    button.className = `copy-link-btn ${type}`;
    button.disabled = true;

    // 원래 상태로 복원
    const restoreTime = type === 'loading' ? 0 : 2000; // 로딩은 즉시, 나머지는 2초 후
    
    if (restoreTime > 0) {
        setTimeout(() => {
            button.textContent = originalText;
            button.className = originalClass;
            button.disabled = false;
        }, restoreTime);
    }
}

// Hash URL에서 공유 링크 처리
function checkForShareLink() {
    const hash = window.location.hash;
    
    // #share/shareId 형태 체크
    const shareMatch = hash.match(/^#share\/([a-zA-Z0-9]{6})$/);
    
    if (shareMatch) {
        const shareId = shareMatch[1];
        console.log('🔗 공유 링크 감지:', shareId);
        
        // Hash 제거 (히스토리 보존)
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 공유 링크 처리
        handleShareLinkAccess(shareId);
        
        return true;
    }
    
    return false;
}

// 공유 링크 접속 처리
async function handleShareLinkAccess(shareId) {
    try {
        console.log('🔍 공유 링크 정보 조회 중:', shareId);
        showAutoConnectFeedback('공유 링크 확인 중...', 'loading');

        // Firebase 초기화 확인
        if (!isFirebaseConnected()) {
            console.log('🔧 Firebase 초기화 시도...');
            if (!initializeFirebase()) {
                showAutoConnectFeedback('❌ Firebase 연결에 실패했습니다', 'error');
                return;
            }
            
            // 초기화 후 잠깐 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // database가 null인지 한 번 더 확인
        if (!database) {
            throw new Error('Firebase database가 초기화되지 않았습니다');
        }

        // Firebase에서 링크 정보 조회
        console.log('📡 Firebase에서 shareLinks/' + shareId + ' 조회 시작');
        const snapshot = await database.ref('shareLinks/' + shareId).once('value');
        const linkData = snapshot.val();
        
        console.log('📦 조회된 링크 데이터:', linkData);

        if (!linkData) {
            showAutoConnectFeedback('❌ 유효하지 않은 공유 링크입니다', 'error');
            return;
        }

        // 만료 체크
        if (linkData.expiresAt && Date.now() > linkData.expiresAt) {
            showAutoConnectFeedback('❌ 만료된 공유 링크입니다', 'error');
            return;
        }

        // 클릭 수 증가
        database.ref('shareLinks/' + shareId + '/clicks').transaction((currentClicks) => {
            return (currentClicks || 0) + 1;
        });

        console.log('✅ 공유 링크 정보:', linkData);
        showAutoConnectFeedback(`"${linkData.meetingName}" 모임에 연결 중...`, 'loading');

        // 접속 코드 자동 입력 및 모임 이동
        const { accessCode, meetingId } = linkData;
        
        // 공유 링크는 모달 없이 바로 연결
        await directConnectToGame(accessCode, meetingId, linkData.meetingName);

    } catch (error) {
        console.error('❌ 공유 링크 처리 실패:', error);
        showAutoConnectFeedback('❌ 공유 링크 처리 중 오류가 발생했습니다', 'error');
    }
}

// 공유 링크를 통한 직접 게임 연결
async function directConnectToGame(accessCode, meetingId, meetingName) {
    try {
        console.log('🎯 직접 게임 연결 시작:', { accessCode, normalizedAccessCode: accessCode.toLowerCase(), meetingId, meetingName });
        
        // 1단계: 온라인 모드 활성화 (조용히, 접속 코드 정규화)
        showAutoConnectFeedback('온라인 모드 연결 중...', 'loading');
        
        const normalizedAccessCode = accessCode.toLowerCase();
        appState.onlineMode.active = true;
        appState.onlineMode.accessCode = normalizedAccessCode;
        appState.onlineMode.connected = true;
        appState.mode = 'online';
        
        // UI 업데이트 (상태바)
        updateOnlineModeUI();
        
        console.log('✅ 온라인 모드 활성화 완료');
        
        // 2단계: Firebase에서 온라인 데이터 로드 (접속 코드 소문자로 정규화)
        showAutoConnectFeedback('게임 데이터 로드 중...', 'loading');
        
        const snapshot = await database.ref('accessCodes/' + normalizedAccessCode).once('value');
        const data = snapshot.val();
        
        if (data && data.meetings) {
            appState.meetings = data.meetings;
            loadMeetings(); // 메인 화면 모임 리스트 업데이트
            console.log('✅ 온라인 데이터 로드 완료:', appState.meetings.length + '개 모임');
        } else {
            console.log('⚠️ 온라인 데이터 없음, 기존 데이터 유지');
        }
        
        // 3단계: 해당 모임 찾기
        showAutoConnectFeedback(`"${meetingName}" 게임 찾는 중...`, 'loading');
        
        const targetMeeting = appState.meetings.find(meeting => meeting.id === meetingId);
        
        if (!targetMeeting) {
            throw new Error(`모임을 찾을 수 없습니다: ${meetingId}`);
        }
        
        console.log('✅ 대상 모임 발견:', targetMeeting.name, targetMeeting.status);
        
        // 4단계: 현재 모임으로 설정
        appState.currentMeeting = targetMeeting;
        
        // 5단계: 게임 화면으로 이동
        if (targetMeeting.status === 'in-progress') {
            showAutoConnectFeedback(`"${meetingName}" 게임 화면으로 이동 중...`, 'loading');
            
            // 잠깐 대기 후 게임 화면으로 이동
            setTimeout(() => {
                showGameScreen(); // 올바른 함수 호출 (initializeGameScreen 포함됨)
                
                // 성공 메시지 표시
                showAutoConnectFeedback(`✅ "${meetingName}" 게임에 참여했습니다!`, 'success');
                
                console.log('🎮 게임 화면 이동 완료');
            }, 1000);
            
        } else {
            // 진행중이 아닌 모임
            showAutoConnectFeedback(`"${meetingName}" 모임을 확인하세요 (${targetMeeting.status})`, 'info');
            console.log('📋 메인 화면에 머물러 있음 - 모임 상태:', targetMeeting.status);
        }
        
    } catch (error) {
        console.error('❌ 직접 게임 연결 실패:', error);
        showAutoConnectFeedback('❌ 게임 연결에 실패했습니다: ' + error.message, 'error');
    }
}