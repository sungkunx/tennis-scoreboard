// 모임 및 멤버 관리 기능들

// 멤버 초기화 (기본 4명)
function initializeMembers() {
    const memberList = document.getElementById('member-list');
    if (!memberList) return;
    
    memberList.innerHTML = '';
    
    for (let i = 0; i < 4; i++) {
        addMemberItem(i);
    }
    
    updateMeetingNamePlaceholder();
}

// 멤버 항목 추가
function addMemberItem(index) {
    const memberList = document.getElementById('member-list');
    if (!memberList) return;
    
    const memberCount = memberList.children.length;
    
    // 기본 이름 생성: AAA(1), BBB(2), CCC(3), ...
    const char = String.fromCharCode(65 + (index % 26));
    const defaultName = char + char + char + `(${index + 1})`;
    
    const memberDiv = document.createElement('div');
    memberDiv.className = 'member-item';
    memberDiv.innerHTML = `
        <input type="text" class="member-name" placeholder="이름" value="${defaultName}" onchange="updateMeetingNamePlaceholder()">
        <select class="member-gender">
            <option value="남">남</option>
            <option value="여">여</option>
            <option value="상관없음">상관없음</option>
        </select>
        <select class="member-skill">
            <option value="1">1(테린이)</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5" selected>5(중간)</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9(테신테왕)</option>
        </select>
        ${memberCount >= 4 ? '<button class="remove-member" onclick="removeMember(this)">×</button>' : '<div style="width: 60px;"></div>'}
    `;
    
    memberList.appendChild(memberDiv);
}

// 멤버 추가
function addMember() {
    const memberList = document.getElementById('member-list');
    if (memberList.children.length >= 16) {
        alert('최대 16명까지 추가할 수 있습니다.');
        return;
    }
    
    addMemberItem(memberList.children.length);
    updateMeetingNamePlaceholder(); // 멤버 추가 시 모임 이름 업데이트
}

// 멤버 제거
function removeMember(button) {
    const memberList = document.getElementById('member-list');
    if (memberList.children.length <= 4) {
        alert('최소 4명의 멤버가 필요합니다.');
        return;
    }
    
    button.parentElement.remove();
    updateMeetingNamePlaceholder(); // 멤버 제거 시 모임 이름 업데이트
}

// 모임 이름 자동 생성
function updateMeetingNamePlaceholder() {
    const memberList = document.getElementById('member-list');
    if (!memberList) return;
    
    const memberCount = memberList.children.length;
    const today = new Date().toLocaleDateString('ko-KR');
    const autoName = `${today} (${memberCount}명)의 테니스 모임`;
    
    const nameInput = document.getElementById('meeting-name');
    if (nameInput) {
        nameInput.placeholder = autoName;
    }
}

// Step1 완료
function completeStep1() {
    const memberItems = document.querySelectorAll('.member-item');
    const members = [];
    const names = [];
    
    for (let item of memberItems) {
        const name = item.querySelector('.member-name').value.trim();
        const gender = item.querySelector('.member-gender').value;
        const skill = parseInt(item.querySelector('.member-skill').value);
        
        if (!name) {
            alert('모든 멤버의 이름을 입력해주세요.');
            return;
        }
        
        if (names.includes(name)) {
            alert('같은 이름이 두개 있습니다');
            return;
        }
        
        names.push(name);
        members.push({ name, gender, skill });
    }
    
    const meetingNameInput = document.getElementById('meeting-name');
    const meetingName = meetingNameInput.value.trim() || meetingNameInput.placeholder;
    
    appState.tempMeeting = {
        name: meetingName,
        members: members,
        date: new Date().toLocaleDateString('ko-KR'),
        status: 'setup'
    };
    
    showStep2();
}

// Step2 모임 요약 표시
function displayMeetingSummary() {
    const summary = document.getElementById('meeting-summary');
    if (!summary || !appState.tempMeeting) return;
    
    const meeting = appState.tempMeeting;
    const memberNames = meeting.members.map(m => m.name).join(', ');
    summary.innerHTML = `
        <div><strong>${meeting.name}</strong></div>
        <div>${meeting.members.length}명: ${memberNames}</div>
    `;
}

// 게임 수 정보 업데이트
function updateGameCountInfo() {
    const courtCount = document.getElementById('court-count')?.value || 2;
    const timeCount = document.getElementById('time-count')?.value || 4;
    const totalGames = courtCount * timeCount;
    
    const info = document.getElementById('game-count-info');
    if (info) {
        info.textContent = `총 ${totalGames}개의 게임이 생성됩니다`;
    }
}

// 모임 편집 (대진표에서)
function editMeetingFromBracket() {
    // 기존 tempMeeting 데이터를 사용해서 Step1부터 다시 시작
    showStep1();
    
    // 기존 데이터로 폼 채우기
    if (appState.tempMeeting) {
        populateStep1Form(appState.tempMeeting);
    }
}

// Step1 폼에 기존 데이터 채우기
function populateStep1Form(meeting) {
    // 모임 이름 채우기
    const nameInput = document.getElementById('meeting-name');
    if (nameInput) {
        nameInput.value = meeting.name;
    }
    
    // 멤버 리스트 채우기
    const memberList = document.getElementById('member-list');
    if (memberList && meeting.members) {
        memberList.innerHTML = '';
        
        meeting.members.forEach((member, index) => {
            addMemberItem(index);
            
            // 추가된 멤버 아이템에 데이터 채우기
            const memberItems = memberList.children;
            const currentItem = memberItems[memberItems.length - 1];
            
            if (currentItem) {
                currentItem.querySelector('.member-name').value = member.name;
                currentItem.querySelector('.member-gender').value = member.gender;
                currentItem.querySelector('.member-skill').value = member.skill;
            }
        });
        
        updateMeetingNamePlaceholder();
    }
}

// 기존 editMeeting 함수 (Step2에서 사용)
function editMeeting() {
    editMeetingFromBracket();
}

// 대진표 생성
function generateBracket() {
    // TODO: 대진표 생성 로직
    console.log('대진표 생성');
}