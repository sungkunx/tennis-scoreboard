// 기존 멤버로 시작하기 기능

// 기존 모임 멤버 선택 모달 표시
function showExistingMembersModal() {
    if (appState.meetings.length === 0) {
        alert('저장된 모임이 없습니다.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>기존 모임 멤버로 시작하기</h3>
                <button class="modal-close" onclick="closeExistingMembersModal()">×</button>
            </div>
            
            <div class="modal-body">
                <p>멤버 정보를 복사할 모임을 선택하세요:</p>
                <div class="existing-meetings-list">
                    ${generateExistingMeetingsList()}
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeExistingMembersModal()">취소</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 기존 모임 리스트 생성
function generateExistingMeetingsList() {
    let html = '';
    
    appState.meetings.forEach((meeting, index) => {
        if (!meeting.members || meeting.members.length === 0) {
            return; // 멤버가 없는 모임은 제외
        }
        
        const memberNames = meeting.members.map(m => m.name).join(', ');
        const memberDetails = meeting.members.map(m => 
            `${m.name}(${m.gender}, 실력${m.skill})`
        ).join(', ');
        
        html += `
            <div class="existing-meeting-item" onclick="selectExistingMeetingMembers(${index})">
                <div class="existing-meeting-header">
                    <div class="existing-meeting-title">${meeting.name}</div>
                    <div class="existing-meeting-date">${meeting.date} | ${meeting.members.length}명</div>
                </div>
                <div class="existing-meeting-members">
                    ${memberDetails}
                </div>
            </div>
        `;
    });
    
    if (html === '') {
        return '<p class="no-members-message">멤버 정보가 있는 모임이 없습니다.</p>';
    }
    
    return html;
}

// 기존 모임 멤버 선택
function selectExistingMeetingMembers(meetingIndex) {
    const selectedMeeting = appState.meetings[meetingIndex];
    
    if (!selectedMeeting || !selectedMeeting.members) {
        alert('해당 모임의 멤버 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 새 모임을 위한 tempMeeting 초기화
    const today = new Date().toLocaleDateString('ko-KR');
    appState.tempMeeting = {
        name: `${today} (${selectedMeeting.members.length}명)의 테니스 모임`,
        members: [...selectedMeeting.members], // 멤버 배열 복사
        date: today,
        status: 'setup'
    };
    
    // 모달 닫기
    closeExistingMembersModal();
    
    // Step1으로 이동하면서 폼에 데이터 채우기
    showStep1();
    
    // 폼 채우기는 DOM이 업데이트된 후에 실행
    setTimeout(() => {
        populateStep1Form(appState.tempMeeting);
    }, 100);
}

// 기존 멤버 모달 닫기
function closeExistingMembersModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}