// localStorage 관련 기능들

// 모임 저장
function saveMeetings(createAutoBackup = false) {
    if (appState.mode === 'offline') {
        localStorage.setItem('tennis-meetings', JSON.stringify(appState.meetings));
    } else if (appState.onlineMode && appState.onlineMode.active) {
        // 온라인 모드에서 Firebase에 저장
        saveToOnline(appState.meetings)
            .then(() => {
                console.log('온라인 저장 완료');
            })
            .catch((error) => {
                console.error('온라인 저장 실패:', error);
                // 실패 시 로컬에라도 저장
                localStorage.setItem('tennis-meetings', JSON.stringify(appState.meetings));
            });
    }
    
    // 자동 백업 생성 (선택적)
    if (createAutoBackup && appState.meetings.length > 0) {
        // 너무 자주 백업되는 것을 방지하기 위해 디바운스 처리
        clearTimeout(window.autoBackupTimeout);
        window.autoBackupTimeout = setTimeout(() => {
            if (typeof createBackup === 'function') {
                createBackup(`자동 백업 ${new Date().toLocaleString('ko-KR')}`)
                    .catch(error => {
                        console.error('자동 백업 실패:', error);
                    });
            }
        }, 2000); // 2초 후 백업
    }
}

// 모임 목록 로드
function loadMeetings(searchTerm = '') {
    const meetingList = document.getElementById('meeting-list');
    
    // 검색 필터링
    let filteredMeetings = appState.meetings;
    if (searchTerm) {
        filteredMeetings = appState.meetings.filter(meeting =>
            meeting.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // 최신순 정렬 (배열 인덱스 역순 = 최근 추가된 것이 위로)
    // timestamp나 id가 있으면 그것 기준으로, 없으면 배열 순서 역순
    filteredMeetings = [...filteredMeetings].sort((a, b) => {
        // timestamp가 있으면 사용 (없으면 0)
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;

        if (timeA && timeB) {
            return timeB - timeA; // timestamp 기준 내림차순
        }

        // timestamp가 없으면 원본 배열에서의 인덱스 기준 역순
        const indexA = appState.meetings.indexOf(a);
        const indexB = appState.meetings.indexOf(b);
        return indexB - indexA;
    });

    if (filteredMeetings.length === 0) {
        meetingList.innerHTML = `<div class="empty-meeting-list">${searchTerm ? '검색 결과가 없습니다' : '저장된 모임이 없습니다'}</div>`;
        return;
    }

    let html = '';
    filteredMeetings.forEach((meeting) => {
        const originalIndex = appState.meetings.findIndex(m => m === meeting);
        const memberNames = meeting.members ? meeting.members.map(m => m.name).join(', ') : '';
        const shortMemberNames = memberNames.length > 30 ? memberNames.substring(0, 30) + '...' : memberNames;
        
        // 모임 상태에 따른 CSS 클래스 설정
        const statusClass = meeting.status === 'in-progress' ? 'in-progress' : '';
        const statusIcon = meeting.status === 'in-progress' ? '🟢' : 
                          (meeting.status === 'setup' || meeting.status === 'ready') ? '⚪' : '⚪';
        
        // 링크 복사 버튼 (진행중인 모임이고 온라인 모드인 경우만)
        const copyButton = meeting.status === 'in-progress' && appState.onlineMode.active 
            ? `<button class="copy-link-btn" onclick="event.stopPropagation(); copyMeetingShareLink(${JSON.stringify(meeting).replace(/"/g, '&quot;')})">🔗 링크복사</button>`
            : '';
        
        html += `
            <div class="meeting-item meeting-card ${statusClass}" data-meeting-id="${meeting.id || ''}" onclick="selectMeeting(${originalIndex}, '${meeting.status}')">
                <div class="meeting-info">
                    <div class="meeting-title">
                        ${statusIcon} ${meeting.name}
                    </div>
                    <div class="meeting-details">
                        ${meeting.date} | ${meeting.members.length}명 | 
                        ${meeting.status === 'completed' ? '완료' : (meeting.status === 'setup' || meeting.status === 'ready') ? '모임세팅중' : '진행중'}
                    </div>
                    <div class="meeting-members">
                        멤버: ${shortMemberNames}
                    </div>
                </div>
                <div class="meeting-actions">
                    ${copyButton}
                    <button class="delete-btn" onclick="deleteMeeting(${originalIndex}, event)">삭제</button>
                </div>
            </div>
        `;
    });
    
    meetingList.innerHTML = html;
}

// 모임 검색
function searchMeetings() {
    const searchTerm = document.getElementById('meeting-search').value;
    loadMeetings(searchTerm);
}

// 검색 초기화
function clearSearch() {
    document.getElementById('meeting-search').value = '';
    loadMeetings();
}

// 모임 선택
function selectMeeting(index, status) {
    const meeting = appState.meetings[index];
    
    if (meeting.status === 'setup') {
        // Setup 상태 모임: tempMeeting으로 로드하고 적절한 단계로 이동
        appState.tempMeeting = { ...meeting };
        
        // step에 따라 적절한 화면으로 이동
        switch (meeting.step) {
            case 'step1-completed':
                // Step2로 이동
                showStep2();
                displayMeetingSummary();
                break;
            case 'step2-completed':
            case 'bracket-generated':
                // 대진표 화면으로 이동
                showBracketScreen();
                break;
            default:
                // Step1으로 이동
                showStep1();
                // 폼에 기존 데이터 채우기
                setTimeout(() => {
                    if (meeting.members) {
                        populateStep1Form(meeting);
                    }
                }, 100);
                break;
        }
    } else {
        // 일반 모임 (active/completed): currentMeeting으로 로드하고 게임 화면으로 이동
        appState.currentMeeting = { ...meeting };
        showGameScreen();
    }
}

// 모임 삭제
function deleteMeeting(index, event) {
    event.stopPropagation();
    if (confirm('이 모임을 삭제하시겠습니까?')) {
        appState.meetings.splice(index, 1);
        saveMeetings();
        loadMeetings();
    }
}