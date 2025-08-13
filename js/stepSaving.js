// 단계별 저장 관련 기능들

// 단계별 진행상황 저장
function saveStepProgress() {
    if (!appState.tempMeeting) return;
    
    // ID가 없으면 생성
    if (!appState.tempMeeting.id) {
        appState.tempMeeting.id = generateMeetingId();
        console.log('🆔 임시 모임 ID 생성:', appState.tempMeeting.id);
    }
    
    // 기존 모임 목록에서 같은 ID의 모임이 있는지 확인
    const existingIndex = appState.meetings.findIndex(meeting => 
        meeting.id === appState.tempMeeting.id
    );
    
    if (existingIndex !== -1) {
        // 기존 모임 업데이트
        appState.meetings[existingIndex] = { ...appState.tempMeeting };
        console.log('🔄 기존 모임 업데이트:', appState.tempMeeting.name);
    } else {
        // 새로운 모임 추가
        appState.meetings.push({ ...appState.tempMeeting });
        console.log('➕ 새로운 모임 추가:', appState.tempMeeting.name);
    }
    
    // 저장
    saveMeetings();
    
    // 모임 목록 새로고침
    loadMeetings();
}

// 임시 모임을 실제 진행 모임으로 변환
function finalizeSetupMeeting() {
    if (!appState.tempMeeting) return;
    
    // status를 'active'로 변경
    appState.tempMeeting.status = 'active';
    appState.tempMeeting.step = 'game-started';
    
    // currentMeeting으로 설정
    appState.currentMeeting = { ...appState.tempMeeting };
    
    // meetings 배열에서 기존 setup 모임 제거하고 active 모임 추가
    const setupIndex = appState.meetings.findIndex(meeting => 
        meeting.name === appState.tempMeeting.name && meeting.status === 'setup'
    );
    
    if (setupIndex !== -1) {
        appState.meetings[setupIndex] = { ...appState.currentMeeting };
    } else {
        appState.meetings.push({ ...appState.currentMeeting });
    }
    
    // tempMeeting 초기화
    appState.tempMeeting = null;
    
    // 저장
    saveMeetings();
}

// 세팅 중인 모임 불러오기
function loadSetupMeeting(meetingIndex) {
    const meeting = appState.meetings[meetingIndex];
    if (!meeting || meeting.status !== 'setup') return false;
    
    // tempMeeting으로 설정
    appState.tempMeeting = { ...meeting };
    
    // step에 따라 적절한 화면으로 이동
    switch (appState.tempMeeting.step) {
        case 'step1-completed':
            // Step2로 이동하고 멤버 정보 복원
            restoreMemberData();
            showStep2();
            displayMeetingSummary();
            break;
        case 'step2-completed':
        case 'bracket-generated':
            // 대진표 화면으로 이동
            restoreMemberData();
            showBracketScreen();
            break;
        default:
            // Step1으로 이동
            restoreMemberData();
            showStep1();
            break;
    }
    
    return true;
}

// 멤버 데이터를 폼에 복원
function restoreMemberData() {
    if (!appState.tempMeeting || !appState.tempMeeting.members) return;
    
    // 모임 이름 복원
    const meetingNameInput = document.getElementById('meeting-name');
    if (meetingNameInput) {
        meetingNameInput.value = appState.tempMeeting.name;
    }
    
    // 멤버 리스트 복원
    const memberList = document.getElementById('member-list');
    if (memberList) {
        memberList.innerHTML = '';
        
        appState.tempMeeting.members.forEach((member, index) => {
            addMemberItem(index);
            const memberItem = memberList.children[index];
            if (memberItem) {
                memberItem.querySelector('.member-name').value = member.name;
                memberItem.querySelector('.member-gender').value = member.gender;
                memberItem.querySelector('.member-skill').value = member.skill;
            }
        });
    }
    
    // 게임 설정 복원
    if (appState.tempMeeting.settings) {
        const settings = appState.tempMeeting.settings;
        
        // 대진표 타입
        if (settings.bracketType) {
            const bracketTypeInputs = document.querySelectorAll('input[name="bracket-type"]');
            bracketTypeInputs.forEach(input => {
                input.checked = input.value === settings.bracketType;
            });
            handleBracketTypeChange();
        }
        
        // 기타 설정들
        const genderSeparateInput = document.getElementById('gender-separate');
        const skillBalanceInput = document.getElementById('skill-balance');
        const courtCountInput = document.getElementById('court-count');
        const timeCountInput = document.getElementById('time-count');
        
        if (genderSeparateInput) genderSeparateInput.checked = settings.genderSeparate || false;
        if (skillBalanceInput) skillBalanceInput.checked = settings.skillBalance || false;
        if (courtCountInput) courtCountInput.value = settings.courtCount || 2;
        if (timeCountInput) timeCountInput.value = settings.timeCount || 4;
        
        // 게임 수 정보 업데이트
        updateGameCountInfo();
        
        // Manual 브래킷의 게임 타입 설정 복원
        if (settings.bracketType === 'manual' && settings.gameTypes) {
            setTimeout(() => {
                restoreManualGameTypes(settings.gameTypes);
            }, 200);
        }
    }
}

// Step1 폼에 데이터 채우기
function populateStep1Form(meeting) {
    // 모임 이름 설정
    const meetingNameInput = document.getElementById('meeting-name');
    if (meetingNameInput && meeting.name) {
        meetingNameInput.value = meeting.name;
    }
    
    // 멤버 리스트 초기화 및 채우기
    const memberList = document.getElementById('member-list');
    if (memberList && meeting.members) {
        memberList.innerHTML = '';
        
        meeting.members.forEach((member, index) => {
            addMemberItem(index);
            const memberItem = memberList.children[index];
            if (memberItem) {
                memberItem.querySelector('.member-name').value = member.name || '';
                memberItem.querySelector('.member-gender').value = member.gender || '남';
                memberItem.querySelector('.member-skill').value = member.skill || 5;
            }
        });
    }
    
    // 모임 이름 플레이스홀더 업데이트
    updateMeetingNamePlaceholder();
}

// 경고 메시지 표시/숨김
function showStatusWarning() {
    const warning = document.getElementById('status-warning');
    if (warning) {
        warning.style.display = 'block';
    }
    
    // 컨테이너 위치 조정 (경고 메시지 공간 확보)
    const container = document.querySelector('.container');
    if (container) {
        container.style.paddingTop = '60px';
    }
}

function hideStatusWarning() {
    const warning = document.getElementById('status-warning');
    if (warning) {
        warning.style.display = 'none';
    }
    
    // 컨테이너 위치 복원
    const container = document.querySelector('.container');
    if (container) {
        container.style.paddingTop = '35px';
    }
}

// 현재 화면이 모임 세팅 중인지 확인
function isInSetupMode() {
    const currentScreen = document.querySelector('div:not(.hidden)');
    const setupScreens = ['step1-screen', 'step2-screen', 'bracket-screen'];
    
    if (currentScreen) {
        return setupScreens.includes(currentScreen.id);
    }
    
    return false;
}

// Manual 게임 타입 설정 복원
function restoreManualGameTypes(gameTypes) {
    const gameButtons = document.querySelectorAll('.game-type-button');
    
    if (gameButtons.length === 0) {
        console.warn('게임 타입 버튼이 아직 생성되지 않았습니다.');
        return;
    }
    
    gameButtons.forEach((button, index) => {
        if (index < gameTypes.length && gameTypes[index]) {
            const gameType = gameTypes[index];
            const selectedType = button.querySelector('.selected-type');
            
            // 게임 타입별 표시 텍스트
            const gameTypeTexts = {
                'mixed': '혼복 (남녀 혼합)',
                'male': '남복 (남성끼리)',
                'female': '여복 (여성끼리)'
            };
            
            if (selectedType && gameTypeTexts[gameType]) {
                selectedType.textContent = gameTypeTexts[gameType];
                button.setAttribute('data-value', gameType);
                
                // 버튼 스타일 업데이트
                button.classList.remove('mixed', 'male', 'female');
                button.classList.add(gameType);
            }
        }
    });
    
    console.log(`✅ Manual 게임 타입 ${gameTypes.length}개 복원 완료`);
}