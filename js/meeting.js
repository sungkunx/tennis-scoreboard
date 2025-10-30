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
    updateRemoveButtonStates(); // 초기화 시 삭제 버튼 상태 설정
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
        <button class="remove-member" onclick="removeMember(this)">×</button>
    `;
    
    memberList.appendChild(memberDiv);
    
    // 삭제 버튼 상태 업데이트
    updateRemoveButtonStates();
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
    updateRemoveButtonStates(); // 삭제 버튼 상태 업데이트
}

// 멤버 제거
function removeMember(button) {
    const memberList = document.getElementById('member-list');
    
    // 버튼이 비활성화된 경우 제거 차단
    if (button.disabled) {
        alert('최소 4명의 멤버가 필요합니다.');
        return;
    }
    
    // 4명 이하로 내려가는 경우 예방
    if (memberList.children.length <= 4) {
        alert('최소 4명의 멤버가 필요합니다.');
        return;
    }
    
    button.parentElement.remove();
    updateMeetingNamePlaceholder(); // 멤버 제거 시 모임 이름 업데이트
    updateGenderWarning(); // 성별 경고 업데이트
    updateRemoveButtonStates(); // 삭제 버튼 상태 업데이트
}

// 삭제 버튼 상태 업데이트
function updateRemoveButtonStates() {
    const memberList = document.getElementById('member-list');
    if (!memberList) return;
    
    const memberCount = memberList.children.length;
    const removeButtons = memberList.querySelectorAll('.remove-member');
    
    // 4명일 때만 모든 삭제 버튼 비활성화
    const shouldDisable = memberCount <= 4;
    
    removeButtons.forEach((button, index) => {
        button.disabled = shouldDisable;
        
        // 비활성화 상태 시각적 표현
        if (shouldDisable) {
            button.style.opacity = '0.4';
            button.style.cursor = 'not-allowed';
            button.title = '최소 4명의 멤버가 필요합니다';
        } else {
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.title = '이 멤버를 삭제합니다';
        }
    });
    
    console.log(`🔘 삭제 버튼 상태 업데이트: ${memberCount}명, 비활성화: ${shouldDisable}`);
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
        timestamp: Date.now(),
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
        updateRemoveButtonStates(); // 기존 데이터 로드 후 삭제 버튼 상태 설정
    }
}

// 기존 editMeeting 함수 (Step2에서 사용)
function editMeeting() {
    editMeetingFromBracket();
}

// 대진표 타입 변경 처리와 setup 함수들은 manualBracket.js에서 통합 처리됨

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
    const skillBalance = document.getElementById('skill-balance')?.checked || false;
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);

    // 게임 타입 분배 가져오기 (항상 사용)
    const maleGames = parseInt(document.getElementById('male-games')?.value) || 0;
    const femaleGames = parseInt(document.getElementById('female-games')?.value) || 0;
    const mixedGamesDisplay = document.getElementById('mixed-games');
    const mixedGames = mixedGamesDisplay ? parseInt(mixedGamesDisplay.textContent) || 0 : 0;

    const manualDistribution = {
        남복: maleGames,
        여복: femaleGames,
        혼복: mixedGames
    };
    console.log('📊 게임 타입 분배 적용:', manualDistribution);

    // 게임 설정 저장
    appState.tempMeeting.settings = {
        bracketType: 'random',
        skillBalance,
        courtCount,
        timeCount,
        manualDistribution
    };
    appState.tempMeeting.step = 'step2-completed';

    // Step2 완료 시 임시 저장 (최초 생성 시만, 재생성이 아닌 경우만)
    if (!appState.tempMeeting.bracket && !window.isRegenerating) {
        saveStepProgress();
    }

    // 대진표 생성 (성별 구분은 항상 true로 전달하여 게임 타입 분배 사용)
    const bracket = createRandomBracket(
        appState.tempMeeting.members,
        courtCount,
        timeCount,
        true,  // genderSeparate: 항상 true (게임 타입 분배 사용)
        skillBalance,
        manualDistribution
    );
    appState.tempMeeting.bracket = bracket;
    appState.tempMeeting.step = 'bracket-generated';

    // 대진표 생성 시 임시 저장 (재생성이 아닌 경우만)
    if (!window.isRegenerating && appState.tempMeeting.status !== 'ready') {
        saveStepProgress();
    }

    // 재생성 플래그 초기화
    window.isRegenerating = false;

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
// ============================================
// 게임 타입 분배 관련 함수들
// ============================================

// 게임 타입 분배 초기화 (성별 매칭과 무관하게 항상 호출)
function initGameTypeDistribution() {
    if (typeof updateGameTypeDistribution === 'function') {
        updateGameTypeDistribution();
    }
}

// +/- 버튼으로 게임 수 증가
function incrementGameCount(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const currentValue = parseInt(input.value) || 0;
    const maxValue = parseInt(input.max) || 999;

    if (currentValue < maxValue) {
        input.value = currentValue + 1;
        updateGameTypeDistribution();
    }
}

// +/- 버튼으로 게임 수 감소
function decrementGameCount(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const currentValue = parseInt(input.value) || 0;
    const minValue = parseInt(input.min) || 0;

    if (currentValue > minValue) {
        input.value = currentValue - 1;
        updateGameTypeDistribution();
    }
}

// 멤버 성별 정보 가져오기
function getMemberGenderInfo() {
    if (!appState.tempMeeting || !appState.tempMeeting.members) {
        return { males: 0, females: 0, total: 0 };
    }

    const members = appState.tempMeeting.members;
    const males = members.filter(m => m.gender === '남').length;
    const females = members.filter(m => m.gender === '여').length;

    return { males, females, total: members.length };
}

// 게임 타입 제약 조건 계산
function calculateGameTypeConstraints(males, females, totalGames) {
    return {
        maleGames: {
            min: 0,
            max: males >= 4 ? totalGames : 0,
            possible: males >= 4
        },
        femaleGames: {
            min: 0,
            max: females >= 4 ? totalGames : 0,
            possible: females >= 4
        },
        mixedGames: {
            min: 0,
            max: (males >= 2 && females >= 2) ? totalGames : 0,
            possible: males >= 2 && females >= 2
        }
    };
}

// 게임 타입 분배 검증
function validateGameTypeDistribution(maleGames, femaleGames, totalGames, males, females) {
    const constraints = calculateGameTypeConstraints(males, females, totalGames);
    const mixedGames = totalGames - maleGames - femaleGames;

    const errors = [];

    // 남복 검증
    if (maleGames > constraints.maleGames.max) {
        if (males < 4) {
            errors.push(`남복을 생성할 수 없습니다 (남성 ${males}명 < 4명)`);
        } else {
            errors.push(`남복은 최대 ${constraints.maleGames.max}게임까지 가능합니다`);
        }
    }

    // 여복 검증
    if (femaleGames > constraints.femaleGames.max) {
        if (females < 4) {
            errors.push(`여복을 생성할 수 없습니다 (여성 ${females}명 < 4명)`);
        } else {
            errors.push(`여복은 최대 ${constraints.femaleGames.max}게임까지 가능합니다`);
        }
    }

    // 합계 검증
    if (maleGames + femaleGames > totalGames) {
        errors.push(`남복 + 여복이 총 게임 수(${totalGames})를 초과합니다`);
    }

    // 혼복 검증
    if (mixedGames < 0) {
        errors.push('혼복 게임이 음수가 될 수 없습니다');
    } else if (mixedGames > 0 && !constraints.mixedGames.possible) {
        if (males < 2) {
            errors.push(`혼복을 생성할 수 없습니다 (남성 ${males}명 < 2명)`);
        } else if (females < 2) {
            errors.push(`혼복을 생성할 수 없습니다 (여성 ${females}명 < 2명)`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        mixedGames,
        constraints
    };
}

// 게임 타입 분배 UI 업데이트
function updateGameTypeDistribution() {
    const genderInfo = getMemberGenderInfo();
    const courtCount = parseInt(document.getElementById('court-count')?.value) || 2;
    const timeCount = parseInt(document.getElementById('time-count')?.value) || 4;
    const totalGames = courtCount * timeCount;

    const maleGamesInput = document.getElementById('male-games');
    const femaleGamesInput = document.getElementById('female-games');
    const mixedGamesDisplay = document.getElementById('mixed-games');

    if (!maleGamesInput || !femaleGamesInput || !mixedGamesDisplay) return;

    const maleGames = parseInt(maleGamesInput.value) || 0;
    const femaleGames = parseInt(femaleGamesInput.value) || 0;

    // 1. 멤버 성별 요약 업데이트
    const summaryEl = document.getElementById('member-gender-summary');
    if (summaryEl) {
        summaryEl.textContent = `남성 ${genderInfo.males}명, 여성 ${genderInfo.females}명`;
    }

    // 2. 제약 조건 계산 및 표시
    const validation = validateGameTypeDistribution(
        maleGames,
        femaleGames,
        totalGames,
        genderInfo.males,
        genderInfo.females
    );

    const constraints = validation.constraints;

    // 남복 제약 표시
    const maleConstraintEl = document.getElementById('male-games-constraint');
    if (maleConstraintEl) {
        if (constraints.maleGames.possible) {
            maleConstraintEl.textContent = `(최대 ${constraints.maleGames.max})`;
            maleConstraintEl.style.color = '#999';
            maleGamesInput.max = constraints.maleGames.max;
        } else {
            maleConstraintEl.textContent = `(불가 - 남성 ${genderInfo.males}명)`;
            maleConstraintEl.style.color = '#ff6b6b';
            maleGamesInput.max = 0;
        }
    }

    // 여복 제약 표시
    const femaleConstraintEl = document.getElementById('female-games-constraint');
    if (femaleConstraintEl) {
        if (constraints.femaleGames.possible) {
            femaleConstraintEl.textContent = `(최대 ${constraints.femaleGames.max})`;
            femaleConstraintEl.style.color = '#999';
            femaleGamesInput.max = constraints.femaleGames.max;
        } else {
            femaleConstraintEl.textContent = `(불가 - 여성 ${genderInfo.females}명)`;
            femaleConstraintEl.style.color = '#ff6b6b';
            femaleGamesInput.max = 0;
        }
    }

    // 3. 혼복 자동 계산 (span으로 표시)
    mixedGamesDisplay.textContent = validation.mixedGames;

    // 4. 검증 메시지 표시
    const validationEl = document.getElementById('distribution-validation');
    if (validationEl) {
        if (validation.valid) {
            validationEl.innerHTML = `✅ 유효한 분배입니다 (총 ${totalGames}게임)`;
            validationEl.style.background = '#d4edda';
            validationEl.style.color = '#155724';
            validationEl.style.border = '1px solid #c3e6cb';
        } else {
            validationEl.innerHTML = '❌ ' + validation.errors.join('<br>❌ ');
            validationEl.style.background = '#f8d7da';
            validationEl.style.color = '#721c24';
            validationEl.style.border = '1px solid #f5c6cb';
        }
    }
}

// 자동 계산 버튼
function autoCalculateDistribution() {
    const genderInfo = getMemberGenderInfo();
    const courtCount = parseInt(document.getElementById('court-count')?.value) || 2;
    const timeCount = parseInt(document.getElementById('time-count')?.value) || 4;
    const totalGames = courtCount * timeCount;

    // bracket.js의 calculateGameTypeDistribution 함수 사용
    if (typeof calculateGameTypeDistribution === 'function') {
        const distribution = calculateGameTypeDistribution(
            genderInfo.males,
            genderInfo.females,
            totalGames
        );

        // 계산된 값을 input에 설정
        const maleGamesInput = document.getElementById('male-games');
        const femaleGamesInput = document.getElementById('female-games');

        if (maleGamesInput) maleGamesInput.value = distribution.남복 || 0;
        if (femaleGamesInput) femaleGamesInput.value = distribution.여복 || 0;

        // UI 업데이트
        updateGameTypeDistribution();

        console.log('🔄 자동 계산 완료:', distribution);
    } else {
        // fallback: 간단한 계산
        const males = genderInfo.males;
        const females = genderInfo.females;

        let maleGames = 0;
        let femaleGames = 0;

        if (males >= 4 && females >= 4) {
            // 비율 기반 분배
            const totalPlayers = males + females;
            const maleRatio = males / totalPlayers;
            const femaleRatio = females / totalPlayers;

            maleGames = Math.floor(totalGames * maleRatio * 0.75); // 25% 혼복 전환
            femaleGames = Math.floor(totalGames * femaleRatio * 0.75);
        } else if (males >= 4) {
            maleGames = Math.floor(totalGames * 0.6);
        } else if (females >= 4) {
            femaleGames = Math.floor(totalGames * 0.6);
        }

        const maleGamesInput = document.getElementById('male-games');
        const femaleGamesInput = document.getElementById('female-games');

        if (maleGamesInput) maleGamesInput.value = maleGames;
        if (femaleGamesInput) femaleGamesInput.value = femaleGames;

        updateGameTypeDistribution();
    }
}
