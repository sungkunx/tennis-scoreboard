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
        <select class="member-gender" onchange="updateGenderWarning()">
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
    updateGenderWarning(); // 성별 경고 업데이트
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
    updateGenderWarning(); // 성별 경고 업데이트
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
    
    // 기존 tempMeeting의 추가 데이터 보존
    const existingData = appState.tempMeeting || {};
    
    appState.tempMeeting = {
        name: meetingName,
        members: members,
        date: new Date().toLocaleDateString('ko-KR'),
        status: 'setup',
        step: 'step1-completed',
        // 기존 데이터 보존
        ...existingData,
        // 위 필드들로 덮어쓰기 (우선순위)
        name: meetingName,
        members: members,
        status: 'setup',
        step: 'step1-completed'
    };
    
    console.log('✅ Step1 완료 - 보존된 데이터:', {
        gameTypes: appState.tempMeeting.gameTypes?.length || 0,
        settings: appState.tempMeeting.settings
    });
    
    // Step1 완료 시 임시 저장
    saveStepProgress();
    
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
    
    // KDK 모드일 때 게임 수 업데이트
    setTimeout(() => {
        const bracketType = document.querySelector('input[name="bracket-type"]:checked')?.value;
        if (bracketType === 'kdk') {
            updateKDKGameCount();
        }
    }, 100);
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
    
    // 셀프 대진표 모드인 경우 게임 그리드 다시 생성
    const bracketType = document.querySelector('input[name="bracket-type"]:checked')?.value;
    if (bracketType === 'manual') {
        // manualBracket.js의 setupManualMode()에서 처리됨
    }
}

// 모임 편집 (대진표에서) - 하위 호환성을 위해 유지
function editMeetingFromBracket() {
    editMembersFromBracket();
}

// 멤버 편집 (대진표에서)
function editMembersFromBracket() {
    console.log('👥 멤버 편집 모드로 이동');
    showStep1();
    
    // 기존 데이터로 폼 채우기
    if (appState.tempMeeting) {
        populateStep1Form(appState.tempMeeting);
    }
}

// 게임 설정 편집 (대진표에서)
function editSettingsFromBracket() {
    console.log('⚙️ 게임 설정 편집 모드로 이동');
    showStep2();
    
    // Step2에서 자동으로 기존 설정이 복원됨 (screens.js의 showStep2 함수에서 처리)
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

// 대진표 타입 변경 처리
function handleBracketTypeChange() {
    const bracketType = document.querySelector('input[name="bracket-type"]:checked').value;
    
    if (bracketType === 'kdk') {
        setupKDKMode();
    } else if (bracketType === 'manual') {
        setupManualMode();
    } else {
        setupRandomMode();
    }
}

// KDK 모드 설정
function setupKDKMode() {
    // 조건 설정 섹션 완전 교체
    const checkboxGroup = document.querySelector('#condition-settings .checkbox-group');
    checkboxGroup.innerHTML = `
        <label class="checkbox-option" id="kdk-skill-balance-option">
            <input type="checkbox" id="kdk-skill-balance">
            <span>실력 구분 (A일수록 높은 실력, 미선택시 전체 랜덤)</span>
        </label>
    `;
    
    // 타임 수 비활성화 (자동 계산)
    const timeCountGroup = document.getElementById('time-count-group');
    const timeCountInput = document.getElementById('time-count');
    timeCountGroup.style.opacity = '0.5';
    timeCountInput.disabled = true;
    
    // 조건 설명 변경
    const conditionInfo = document.getElementById('condition-info');
    conditionInfo.textContent = '* KDK 방식: 5~10명, 각 참가자 4게임 고정, 실력별 번호 배정';
    
    // 셀프 대진표 설정 섹션 숨기기
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    if (manualBracketSettings) {
        manualBracketSettings.style.display = 'none';
    }
    
    updateKDKGameCount();
}

// 랜덤 모드 설정
function setupRandomMode() {
    // 조건 설정 섹션 원래대로 복원
    const checkboxGroup = document.querySelector('#condition-settings .checkbox-group');
    checkboxGroup.innerHTML = `
        <label class="checkbox-option" id="gender-separate-option">
            <input type="checkbox" id="gender-separate">
            <span>성별 구분 (남복/여복 구분)</span>
        </label>
        <label class="checkbox-option" id="skill-balance-option">
            <input type="checkbox" id="skill-balance">
            <span>실력 구분 (가능한 상대팀은 실력이 비슷하게 설정)</span>
        </label>
    `;
    
    // 타임 수 활성화
    const timeCountGroup = document.getElementById('time-count-group');
    const timeCountInput = document.getElementById('time-count');
    timeCountGroup.style.opacity = '1';
    timeCountInput.disabled = false;
    
    // 조건 설명 복원
    const conditionInfo = document.getElementById('condition-info');
    conditionInfo.textContent = '* 다음 단계에서 대진표가 나오면 수정이 가능합니다';
    
    // 셀프 대진표 설정 섹션 숨기기
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    if (manualBracketSettings) {
        manualBracketSettings.style.display = 'none';
    }
    
    updateGameCountInfo();
}

// 셀프 대진표 모드 설정
function setupManualMode() {
    // 조건 설정 섹션에서 성별 매칭 옵션 비활성화
    const checkboxGroup = document.querySelector('#condition-settings .checkbox-group');
    checkboxGroup.innerHTML = `
        <label class="checkbox-option disabled" id="gender-separate-option">
            <input type="checkbox" id="gender-separate" disabled>
            <span>성별 매칭 (셀프 대진표에서는 사용할 수 없음)</span>
        </label>
        <label class="checkbox-option" id="skill-balance-option">
            <input type="checkbox" id="skill-balance">
            <span>실력 구분 (가능한 상대팀은 실력이 비슷하게 설정)</span>
        </label>
    `;
    
    // 타임 수 활성화
    const timeCountGroup = document.getElementById('time-count-group');
    const timeCountInput = document.getElementById('time-count');
    timeCountGroup.style.opacity = '1';
    timeCountInput.disabled = false;
    
    // 조건 설명 변경
    const conditionInfo = document.getElementById('condition-info');
    conditionInfo.textContent = '* 셀프 대진표 모드에서는 직접 게임별 복식 속성을 설정할 수 있습니다';
    
    // 셀프 대진표 설정 섹션 표시
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    if (manualBracketSettings) {
        manualBracketSettings.style.display = 'block';
        // manualBracket.js의 generateManualGamesGrid()가 호출됨
    }
    
    updateGameCountInfo();
}

// 셀프 대진표 게임 그리드 생성 (Select 방식 - 사용 안함)
function generateManualGamesGridSelect() {
    const courtCount = parseInt(document.getElementById('court-count')?.value || 2);
    const timeCount = parseInt(document.getElementById('time-count')?.value || 4);
    const totalGames = courtCount * timeCount;
    
    const gridContainer = document.getElementById('manual-games-grid');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '';
    
    for (let time = 1; time <= timeCount; time++) {
        for (let court = 1; court <= courtCount; court++) {
            const gameIndex = (time - 1) * courtCount + court - 1;
            const gameDiv = document.createElement('div');
            gameDiv.className = 'manual-game-item';
            gameDiv.innerHTML = `
                <div class="game-info">
                    <strong>${time}타임 ${court}코트</strong>
                </div>
                <div class="game-type-selector">
                    <label>복식 속성:</label>
                    <select class="game-type-select" data-game-index="${gameIndex}">
                        <option value="mixed">혼복 (남녀혼합)</option>
                        <option value="male">남복 (남성끼리)</option>
                        <option value="female">여복 (여성끼리)</option>
                    </select>
                </div>
            `;
            gridContainer.appendChild(gameDiv);
        }
    }
}

// KDK 게임 수 업데이트
function updateKDKGameCount() {
    if (!appState.tempMeeting || !appState.tempMeeting.members) {
        return;
    }
    
    const memberCount = appState.tempMeeting.members.length;
    const courtCount = document.getElementById('court-count')?.value || 2;
    
    if (memberCount < 5 || memberCount > 10) {
        const info = document.getElementById('game-count-info');
        info.textContent = `⚠️ KDK 방식은 5명에서 10명까지만 가능합니다 (현재 ${memberCount}명)`;
        info.style.color = 'red';
        return;
    }
    
    // KDK는 각자 4경기씩, 하지만 코트와 타임에 따라 전체 게임수 계산
    const baseTimeCount = 4; // KDK는 기본 4타임
    const totalGames = courtCount * baseTimeCount;
    
    // 타임 수 자동 설정
    document.getElementById('time-count').value = baseTimeCount;
    
    const info = document.getElementById('game-count-info');
    info.textContent = `총 ${totalGames}개의 게임이 생성됩니다 (${baseTimeCount}타임)`;
    info.style.color = '';
}

// 대진표 생성
function generateBracket() {
    const bracketType = document.querySelector('input[name="bracket-type"]:checked').value;
    
    if (bracketType === 'kdk') {
        // KDK 모드 인원 체크 (5-10명)
        const memberCount = appState.tempMeeting.members.length;
        if (memberCount < 5 || memberCount > 10) {
            showKDKPlayerCountWarning(memberCount);
            return;
        }
        generateKDKBracket();
    } else if (bracketType === 'manual') {
        generateManualBracket();
    } else {
        generateRandomBracket();
    }
}

// 기존 랜덤 대진표 생성 함수 (bracket.js에서 이동)
function generateRandomBracket() {
    const genderSeparate = document.getElementById('gender-separate').checked;
    const skillBalance = document.getElementById('skill-balance').checked;
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);
    
    // 게임 설정 저장
    appState.tempMeeting.settings = {
        bracketType: 'random',
        genderSeparate,
        skillBalance,
        courtCount,
        timeCount
    };
    appState.tempMeeting.step = 'step2-completed';
    
    // Step2 완료 시 임시 저장
    saveStepProgress();
    
    // 대진표 생성
    const bracket = createRandomBracket(appState.tempMeeting.members, courtCount, timeCount, genderSeparate, skillBalance);
    appState.tempMeeting.bracket = bracket;
    appState.tempMeeting.step = 'bracket-generated';
    
    // 대진표 생성 시 임시 저장
    saveStepProgress();
    
    // 대진표 상태만 업데이트, 아직 저장하지 않음
    appState.tempMeeting.status = 'ready';
    
    // 대진표 화면으로 이동
    showBracketScreen();
}

// KDK 인원 경고 모달 표시
function showKDKPlayerCountWarning(memberCount) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>KDK 방식 인원 제한</h3>
                <button class="modal-close" onclick="closeKDKPlayerCountWarning()">×</button>
            </div>
            
            <div class="modal-body">
                <p><strong>KDK방식은 5명에서 10명까지만 가능합니다.</strong></p>
                <p>현재 참가자: <strong>${memberCount}명</strong></p>
                <p>멤버 수를 조정하거나 랜덤 생성 방식을 선택해주세요.</p>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeKDKPlayerCountWarning()">취소</button>
                <button class="btn-primary" onclick="goToStep1FromWarning()">멤버 수정</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// KDK 인원 경고 모달 닫기
function closeKDKPlayerCountWarning() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 셀프 대진표 생성
function generateManualBracket() {
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);
    
    // 모든 게임의 복식 속성이 선택되었는지 확인
    const gameButtons = document.querySelectorAll('.game-type-button');
    const gameTypes = [];
    let allSelected = true;
    
    gameButtons.forEach((button, index) => {
        const value = button.getAttribute('data-value');
        if (!value) {
            allSelected = false;
        }
        gameTypes.push(value);
    });
    
    if (!allSelected) {
        alert('모든 게임의 복식 속성을 선택해주세요.');
        return;
    }
    
    // 게임 설정 저장
    appState.tempMeeting.settings = {
        bracketType: 'manual',
        courtCount,
        timeCount,
        gameTypes: gameTypes
    };
    appState.tempMeeting.step = 'step2-completed';
    
    // Step2 완료 시 임시 저장
    saveStepProgress();
    
    // 수동 대진표 생성
    const bracket = createManualBracket(appState.tempMeeting.members, courtCount, timeCount, gameTypes);
    appState.tempMeeting.bracket = bracket;
    appState.tempMeeting.step = 'bracket-generated';
    
    // 대진표 생성 시 임시 저장
    saveStepProgress();
    
    // 대진표 상태만 업데이트, 아직 저장하지 않음
    appState.tempMeeting.status = 'ready';
    
    // 대진표 화면으로 이동
    showBracketScreen();
}

// 성별 경고 업데이트
function updateGenderWarning() {
    const genderSeparate = document.getElementById('gender-separate');
    const warningDiv = document.getElementById('gender-warning');
    
    if (!genderSeparate || !warningDiv) return;
    
    // 성별 매칭이 선택되지 않았으면 경고 숨김
    if (!genderSeparate.checked) {
        warningDiv.style.display = 'none';
        return;
    }
    
    // 현재 멤버들의 성별 집계
    const memberItems = document.querySelectorAll('.member-item');
    let maleCount = 0;
    let femaleCount = 0;
    
    memberItems.forEach(item => {
        const genderSelect = item.querySelector('.member-gender');
        if (genderSelect) {
            const gender = genderSelect.value;
            if (gender === '남') maleCount++;
            else if (gender === '여') femaleCount++;
        }
    });
    
    // 한 성별이 4명 이하인 경우 경고 표시
    if (maleCount <= 4 || femaleCount <= 4) {
        warningDiv.style.display = 'block';
    } else {
        warningDiv.style.display = 'none';
    }
}

// 경고에서 Step1으로 이동
function goToStep1FromWarning() {
    closeKDKPlayerCountWarning();
    showStep1();
}

// KDK 대진표 생성 함수
function generateKDKBracket() {
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);
    
    // KDK 실력 구분 옵션 확인
    const kdkSkillBalance = document.getElementById('kdk-skill-balance')?.checked || false;
    
    // 게임 설정 저장
    appState.tempMeeting.settings = {
        bracketType: 'kdk',
        kdkSkillBalance,
        courtCount,
        timeCount
    };
    appState.tempMeeting.step = 'step2-completed';
    
    // Step2 완료 시 임시 저장
    saveStepProgress();
    
    // KDK 대진표 생성
    const bracket = createKDKBracket(appState.tempMeeting.members, courtCount, kdkSkillBalance);
    appState.tempMeeting.bracket = bracket;
    appState.tempMeeting.step = 'bracket-generated';
    
    // 대진표 생성 시 임시 저장
    saveStepProgress();
    
    // 대진표 상태만 업데이트, 아직 저장하지 않음
    appState.tempMeeting.status = 'ready';
    
    // 대진표 화면으로 이동
    showBracketScreen();
}