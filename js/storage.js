// localStorage 관련 기능들

// 모임 저장
function saveMeetings() {
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
    
    if (filteredMeetings.length === 0) {
        meetingList.innerHTML = `<div class="empty-meeting-list">${searchTerm ? '검색 결과가 없습니다' : '저장된 모임이 없습니다'}</div>`;
        return;
    }

    let html = '';
    filteredMeetings.forEach((meeting) => {
        const originalIndex = appState.meetings.findIndex(m => m === meeting);
        const memberNames = meeting.members ? meeting.members.map(m => m.name).join(', ') : '';
        const shortMemberNames = memberNames.length > 30 ? memberNames.substring(0, 30) + '...' : memberNames;
        
        html += `
            <div class="meeting-item" onclick="selectMeeting(${originalIndex})">
                <div class="meeting-info">
                    <div class="meeting-title">${meeting.name}</div>
                    <div class="meeting-details">
                        ${meeting.date} | ${meeting.members.length}명 | 
                        ${meeting.status === 'completed' ? '완료' : '진행중'}
                    </div>
                    <div class="meeting-members">
                        멤버: ${shortMemberNames}
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteMeeting(${originalIndex}, event)">삭제</button>
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
function selectMeeting(index) {
    const meeting = appState.meetings[index];
    appState.currentMeeting = meeting;
    
    if (meeting.status === 'setup') {
        showStep2();
    } else {
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