// 셀프 대진표 생성 관련 기능들

// 수동 대진표 전용 조합 추적 시스템 (자동 대진표와 독립)
let manualUsedCombinations = new Map(); // key: combination, value: usage count
let manualCurrentBracketId = null;

// 수동 대진표용 조합 키 생성
function getManualCombinationKey(team1, team2) {
    const sortedTeam1 = team1.map(p => p.name).sort();
    const sortedTeam2 = team2.map(p => p.name).sort();
    const teams = [sortedTeam1.join(','), sortedTeam2.join(',')].sort();
    return teams.join(' vs ');
}

// 수동 대진표용 조합 추적 초기화
function initializeManualCombinationTracking(bracketId) {
    manualCurrentBracketId = bracketId;
    manualUsedCombinations.clear();
    console.log('🎯 수동 대진표 조합 추적 초기화:', bracketId);
}

// 4명으로 가능한 모든 2vs2 조합 생성
function generateAllTeamCombinations(members) {
    if (members.length !== 4) {
        return [];
    }
    
    const [a, b, c, d] = members;
    return [
        { team1: [a, b], team2: [c, d] },
        { team1: [a, c], team2: [b, d] },
        { team1: [a, d], team2: [b, c] }
    ];
}

// 수동 대진표용 최적 조합 찾기 (다양화 우선, 필요시 중복 허용)
function findBestManualTeamCombination(availableMembers, memberGameCount) {
    if (availableMembers.length < 4) {
        return null;
    }
    
    // 게임 수가 적은 멤버들을 우선 선택
    const sortedMembers = availableMembers.sort((a, b) => 
        (memberGameCount[a.name] || 0) - (memberGameCount[b.name] || 0)
    );
    
    // 처음 4명으로 모든 가능한 조합 생성
    const selectedMembers = sortedMembers.slice(0, 4);
    const allCombinations = generateAllTeamCombinations(selectedMembers);
    
    // 1단계: 완전히 새로운 조합 찾기
    for (const combo of allCombinations) {
        const key = getManualCombinationKey(combo.team1, combo.team2);
        if (!manualUsedCombinations.has(key)) {
            manualUsedCombinations.set(key, 1);
            console.log('✨ 새로운 수동 조합 사용:', key);
            return combo;
        }
    }
    
    // 2단계: 가장 적게 사용된 조합 찾기
    let bestCombo = null;
    let minUsage = Infinity;
    
    for (const combo of allCombinations) {
        const key = getManualCombinationKey(combo.team1, combo.team2);
        const usage = manualUsedCombinations.get(key) || 0;
        if (usage < minUsage) {
            minUsage = usage;
            bestCombo = combo;
        }
    }
    
    if (bestCombo) {
        const key = getManualCombinationKey(bestCombo.team1, bestCombo.team2);
        manualUsedCombinations.set(key, (manualUsedCombinations.get(key) || 0) + 1);
        console.log(`🔄 수동 조합 재사용 (${manualUsedCombinations.get(key)}번째):`, key);
        return bestCombo;
    }
    
    return null;
}

// 수동 대진표 생성 (복식 속성 지정 + 자동 선수 배정)
function createManualBracket(members, courtCount, timeCount, gameTypes) {
    console.log('🎾 수동 대진표 생성 시작:', { 
        멤버수: members.length, 
        코트수: courtCount, 
        타임수: timeCount, 
        게임타입: gameTypes 
    });

    // 수동 대진표 전용 조합 추적 시스템 초기화
    const bracketId = `manual_${Date.now()}_${members.length}명`;
    initializeManualCombinationTracking(bracketId);

    const games = [];
    const totalGames = courtCount * timeCount;
    
    // 각 멤버의 게임 수 추적
    const memberGameCount = {};
    members.forEach(member => {
        memberGameCount[member.name] = 0;
    });

    // 성별별 멤버 분류
    const maleMembers = members.filter(m => m.gender === '남');
    const femaleMembers = members.filter(m => m.gender === '여');
    const anyGenderMembers = members.filter(m => m.gender === '상관없음');

    console.log('👥 멤버 분류:', {
        남성: maleMembers.length,
        여성: femaleMembers.length,
        상관없음: anyGenderMembers.length
    });

    // 각 게임 생성 및 선수 배정
    for (let time = 1; time <= timeCount; time++) {
        for (let court = 1; court <= courtCount; court++) {
            const gameIndex = (time - 1) * courtCount + (court - 1);
            const gameType = gameTypes[gameIndex];
            
            // 게임 타입에 따른 팀 생성
            const teams = createTeamsForGameType(
                gameType, maleMembers, femaleMembers, anyGenderMembers, 
                memberGameCount, bracketId
            );
            
            if (!teams) {
                console.warn(`❌ 타임 ${time} 코트 ${court} (${gameType}) 팀 생성 실패`);
                continue;
            }

            const game = {
                id: `${time}-${court}`,
                time: time,
                court: court,
                team1: teams.team1,
                team2: teams.team2,
                score: { team1: 0, team2: 0 },
                status: 'pending',
                gameType: gameType
            };
            
            games.push(game);
            
            // 게임 수 카운트 업데이트
            teams.team1.forEach(member => memberGameCount[member.name]++);
            teams.team2.forEach(member => memberGameCount[member.name]++);
        }
    }

    console.log('✅ 수동 대진표 생성 완료:', { 
        생성된게임수: games.length,
        멤버게임수: memberGameCount 
    });

    return {
        games: games,
        settings: {
            courtCount: courtCount,
            timeCount: timeCount,
            totalGames: totalGames,
            bracketType: 'manual',
            gameTypes: gameTypes
        },
        memberGameCount: memberGameCount
    };
}

// 게임 타입에 따른 팀 생성 (수동 대진표 전용 개선 버전)
function createTeamsForGameType(gameType, maleMembers, femaleMembers, anyGenderMembers, memberGameCount, bracketId) {
    let availableMembers = [];
    
    // 게임 타입에 따른 사용 가능한 멤버 설정
    switch (gameType) {
        case 'male':
            availableMembers = [...maleMembers, ...anyGenderMembers];
            break;
        case 'female':
            availableMembers = [...femaleMembers, ...anyGenderMembers];
            break;
        case 'mixed':
            availableMembers = [...maleMembers, ...femaleMembers, ...anyGenderMembers];
            break;
        default:
            console.warn(`알 수 없는 게임 타입: ${gameType}`);
            return null;
    }
    
    if (availableMembers.length < 4) {
        console.warn(`${gameType} 게임을 위한 충분한 멤버가 없습니다. (필요: 4명, 사용가능: ${availableMembers.length}명)`);
        return null;
    }
    
    console.log(`🎯 ${gameType} 게임 팀 생성 시작 (사용 가능 멤버: ${availableMembers.length}명)`);
    
    // 혼복의 경우 성별 균형을 고려한 특별 처리
    if (gameType === 'mixed') {
        return createMixedTeamsAdvanced(availableMembers, memberGameCount, maleMembers, femaleMembers, anyGenderMembers);
    } else {
        // 남복/여복의 경우 새로운 조합 찾기 로직 사용
        return findBestManualTeamCombination(availableMembers, memberGameCount);
    }
}

// 혼복 게임용 고급 팀 생성 (성별 균형 고려)
function createMixedTeamsAdvanced(availableMembers, memberGameCount, maleMembers, femaleMembers, anyGenderMembers) {
    const maleAvailable = [...maleMembers, ...anyGenderMembers];
    const femaleAvailable = [...femaleMembers, ...anyGenderMembers];
    
    // 최소 남녀 각각 2명씩 필요
    if (maleAvailable.length < 2 || femaleAvailable.length < 2) {
        console.warn('혼복 게임을 위한 남녀 멤버가 부족합니다');
        // 부족한 경우에도 가능한 조합으로 진행
        return findBestManualTeamCombination(availableMembers, memberGameCount);
    }
    
    // 게임 수가 적은 멤버들 우선 선택
    maleAvailable.sort((a, b) => (memberGameCount[a.name] || 0) - (memberGameCount[b.name] || 0));
    femaleAvailable.sort((a, b) => (memberGameCount[a.name] || 0) - (memberGameCount[b.name] || 0));
    
    // 이상적인 혼복 구성: 각 팀에 남녀 1명씩
    const male1 = maleAvailable[0];
    const male2 = maleAvailable[1];
    const female1 = femaleAvailable[0];
    const female2 = femaleAvailable[1];
    
    // 가능한 혼복 조합들
    const mixedCombinations = [
        { team1: [male1, female1], team2: [male2, female2] },
        { team1: [male1, female2], team2: [male2, female1] }
    ];
    
    // 사용하지 않은 조합 우선 선택
    for (const combo of mixedCombinations) {
        const key = getManualCombinationKey(combo.team1, combo.team2);
        if (!manualUsedCombinations.has(key)) {
            manualUsedCombinations.set(key, 1);
            console.log('✨ 새로운 혼복 조합 사용:', key);
            return combo;
        }
    }
    
    // 모든 조합이 사용되었다면 가장 적게 사용된 조합 선택
    let bestCombo = mixedCombinations[0];
    let minUsage = Infinity;
    
    for (const combo of mixedCombinations) {
        const key = getManualCombinationKey(combo.team1, combo.team2);
        const usage = manualUsedCombinations.get(key) || 0;
        if (usage < minUsage) {
            minUsage = usage;
            bestCombo = combo;
        }
    }
    
    const key = getManualCombinationKey(bestCombo.team1, bestCombo.team2);
    manualUsedCombinations.set(key, (manualUsedCombinations.get(key) || 0) + 1);
    console.log(`🔄 혼복 조합 재사용 (${manualUsedCombinations.get(key)}번째):`, key);
    
    return bestCombo;
}


// 수동 게임 그리드 생성 (2열 레이아웃)
function generateManualGamesGrid() {
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);
    const grid = document.getElementById('manual-games-grid');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let time = 1; time <= timeCount; time++) {
        // 타임 헤더 추가 (모든 타임에 표시)
        const timeHeader = document.createElement('div');
        timeHeader.className = 'time-header';
        timeHeader.textContent = `타임 ${time}`;
        grid.appendChild(timeHeader);
        
        // 각 타임의 코트들 추가
        for (let court = 1; court <= courtCount; court++) {
            const gameItem = document.createElement('div');
            gameItem.className = 'manual-game-item';
            
            gameItem.innerHTML = `
                <h4>타임 ${time} - 코트 ${court}</h4>
                <div class="game-type-button" data-time="${time}" data-court="${court}" onclick="showGameTypeModal(${time}, ${court})">
                    <span class="selected-type">복식 속성 선택</span>
                    <span class="dropdown-arrow">▼</span>
                </div>
            `;
            
            grid.appendChild(gameItem);
        }
        
        // 홀수 코트인 경우 빈 칸 추가
        if (courtCount % 2 === 1) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'empty-slot';
            emptySlot.textContent = '';
            grid.appendChild(emptySlot);
        }
    }
    
    // 그리드 생성 후 기존 선택 복원
    setTimeout(() => {
        restoreManualGameTypeSelections();
        updateGameTypeCounter();
    }, 50);
}

// 수동 모드 설정
function setupManualMode() {
    console.log('✏️ 셀프 대진표 모드 설정 시작...');
    // 성별 매칭 옵션 비활성화
    const conditionSettings = document.getElementById('condition-settings');
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    
    if (conditionSettings) {
        conditionSettings.innerHTML = `
            <label class="form-label">조건 설정</label>
            <div class="checkbox-group">
                <label class="checkbox-option disabled" id="gender-separate-option">
                    <input type="checkbox" id="gender-separate" disabled>
                    <span>성별 매칭 (셀프 대진표에서는 사용할 수 없음)</span>
                </label>
                <label class="checkbox-option" id="skill-balance-option">
                    <input type="checkbox" id="skill-balance">
                    <span>실력 구분 (가능한 상대팀은 실력이 비슷하게 설정)</span>
                </label>
            </div>
            <p class="info-text" id="condition-info">* 셀프 대진표에서는 각 게임의 복식 속성을 직접 선택합니다</p>
        `;
    }
    
    // 수동 브래킷 설정 섹션 표시
    if (manualBracketSettings) {
        manualBracketSettings.style.display = 'block';
    }
    
    // 타임 수 활성화
    const timeCountGroup = document.getElementById('time-count-group');
    const timeCountInput = document.getElementById('time-count');
    if (timeCountGroup) timeCountGroup.style.opacity = '1';
    if (timeCountInput) timeCountInput.disabled = false;
    
    // 게임 그리드 생성
    generateManualGamesGrid();
    
    // 기존 선택된 게임 타입 복원 (DOM 렌더링 후)
    setTimeout(() => {
        restoreManualGameTypeSelections();
        // 카운터 초기화
        updateGameTypeCounter();
    }, 100);
}

// 랜덤 모드 설정 (수동 브래킷 설정 숨김)
function setupRandomMode() {
    const conditionSettings = document.getElementById('condition-settings');
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    
    if (conditionSettings) {
        conditionSettings.innerHTML = `
            <label class="form-label">조건 설정</label>
            <div class="checkbox-group">
                <label class="checkbox-option" id="gender-separate-option">
                    <input type="checkbox" id="gender-separate" onchange="updateGenderWarning()">
                    <span>성별 매칭 (남성끼리, 여성끼리 매칭)</span>
                </label>
                <div class="gender-warning" id="gender-warning" style="display: none;">
                    <p class="warning-text">⚠️ 한가지 성별이 4명 이하인 경우에는 정상적으로 매칭되지 않을 수 있습니다.</p>
                </div>
                <label class="checkbox-option" id="skill-balance-option">
                    <input type="checkbox" id="skill-balance">
                    <span>실력 균형 (비슷한 실력끼리 매칭)</span>
                </label>
            </div>
            <p class="info-text" id="condition-info">* 다음 단계에서 대진표가 나오면 수정이 가능합니다</p>
        `;
    }
    
    // 수동 브래킷 설정 섹션 숨김
    if (manualBracketSettings) {
        manualBracketSettings.style.display = 'none';
    }
    
    // 타임 수 활성화
    const timeCountGroup = document.getElementById('time-count-group');
    const timeCountInput = document.getElementById('time-count');
    if (timeCountGroup) timeCountGroup.style.opacity = '1';
    if (timeCountInput) timeCountInput.disabled = false;
}

// KDK 모드 설정 (수동 브래킷 설정 숨김)
function setupKDKMode() {
    const conditionSettings = document.getElementById('condition-settings');
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    
    if (conditionSettings) {
        conditionSettings.innerHTML = `
            <label class="form-label">조건 설정</label>
            <div class="checkbox-group">
                <label class="checkbox-option" id="kdk-skill-balance-option">
                    <input type="checkbox" id="kdk-skill-balance">
                    <span>KDK 실력 구분 (실력에 따라 KDK 번호 배정)</span>
                </label>
            </div>
            <p class="info-text" id="condition-info">* KDK 방식은 5-10명만 가능하며, 각자 4경기씩 진행됩니다</p>
        `;
    }
    
    // 수동 브래킷 설정 섹션 숨김
    if (manualBracketSettings) {
        manualBracketSettings.style.display = 'none';
    }
    
    // 타임 수 비활성화 (KDK는 고정 4타임)
    const timeCountGroup = document.getElementById('time-count-group');
    const timeCountInput = document.getElementById('time-count');
    if (timeCountGroup) timeCountGroup.style.opacity = '0.5';
    if (timeCountInput) {
        timeCountInput.disabled = true;
        timeCountInput.value = '4';
    }
}

// 대진표 타입 변경 핸들러
function handleBracketTypeChange() {
    console.log('📋 대진표 타입 변경 처리 시작 (manualBracket.js)');
    const bracketTypeInput = document.querySelector('input[name="bracket-type"]:checked');
    
    if (!bracketTypeInput) {
        console.error('❌ 선택된 대진표 타입을 찾을 수 없습니다');
        return;
    }
    
    const bracketType = bracketTypeInput.value;
    console.log('📋 선택된 대진표 타입:', bracketType);
    
    if (bracketType === 'kdk') {
        console.log('🔢 KDK 모드 설정 중...');
        setupKDKMode();
    } else if (bracketType === 'manual') {
        console.log('✏️ 셀프 대진표 모드 설정 중...');
        setupManualMode();
    } else {
        console.log('🎲 랜덤 대진표 모드 설정 중...');
        setupRandomMode();
    }
    
    // 게임 수 정보 업데이트
    updateGameCountInfo();
}

// 게임 타입 선택 모달 표시
function showGameTypeModal(time, court) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content game-type-modal">
            <div class="modal-header">
                <h3>타임 ${time} - 코트 ${court}</h3>
                <h4>복식 속성을 선택하세요</h4>
            </div>
            <div class="game-type-buttons">
                <button class="game-type-option mixed" onclick="selectGameType(${time}, ${court}, 'mixed', '혼복 (남녀 혼합)')">
                    <div class="option-icon">👫</div>
                    <div class="option-text">혼복</div>
                    <div class="option-desc">남녀 혼합</div>
                </button>
                <button class="game-type-option male" onclick="selectGameType(${time}, ${court}, 'male', '남복 (남성끼리)')">
                    <div class="option-icon">👨‍👨‍👦‍👦</div>
                    <div class="option-text">남복</div>
                    <div class="option-desc">남성끼리</div>
                </button>
                <button class="game-type-option female" onclick="selectGameType(${time}, ${court}, 'female', '여복 (여성끼리)')">
                    <div class="option-icon">👩‍👩‍👧‍👧</div>
                    <div class="option-text">여복</div>
                    <div class="option-desc">여성끼리</div>
                </button>
            </div>
            <button class="modal-close-btn" onclick="closeGameTypeModal()">취소</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 애니메이션
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// 게임 타입 선택
function selectGameType(time, court, value, displayText) {
    const button = document.querySelector(`[data-time="${time}"][data-court="${court}"]`);
    if (button) {
        const selectedType = button.querySelector('.selected-type');
        selectedType.textContent = displayText;
        
        // 데이터 속성에 값 저장
        button.setAttribute('data-value', value);
        
        // 버튼 스타일 업데이트
        button.classList.remove('mixed', 'male', 'female');
        button.classList.add(value);
        
        // tempMeeting에 gameTypes 배열 저장
        if (!appState.tempMeeting) {
            appState.tempMeeting = {};
        }
        if (!appState.tempMeeting.gameTypes) {
            appState.tempMeeting.gameTypes = [];
        }
        
        const courtCount = parseInt(document.getElementById('court-count').value);
        const gameIndex = (time - 1) * courtCount + (court - 1);
        appState.tempMeeting.gameTypes[gameIndex] = value;
        
        console.log(`🎯 게임 타입 저장: 타임${time} 코트${court} = ${value} (인덱스: ${gameIndex})`);
        console.log('💾 현재 저장된 gameTypes:', appState.tempMeeting.gameTypes);
        
        // 카운터 업데이트
        updateGameTypeCounter();
    }
    
    closeGameTypeModal();
}

// 게임 타입 모달 닫기
function closeGameTypeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.add('hide');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 수동 게임 타입 선택 복원
function restoreManualGameTypeSelections() {
    if (!appState.tempMeeting?.gameTypes || appState.tempMeeting.gameTypes.length === 0) {
        console.log('📋 복원할 게임 타입 없음');
        return;
    }
    
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);
    const gameTypes = appState.tempMeeting.gameTypes;
    
    const gameTypeTexts = {
        'mixed': '혼복 (남녀 혼합)',
        'male': '남복 (남성끼리)', 
        'female': '여복 (여성끼리)'
    };
    
    console.log('🔄 게임 타입 복원 시작:', gameTypes);
    
    for (let time = 1; time <= timeCount; time++) {
        for (let court = 1; court <= courtCount; court++) {
            const gameIndex = (time - 1) * courtCount + (court - 1);
            const gameType = gameTypes[gameIndex];
            
            if (gameType) {
                const button = document.querySelector(`[data-time="${time}"][data-court="${court}"]`);
                if (button) {
                    const selectedType = button.querySelector('.selected-type');
                    selectedType.textContent = gameTypeTexts[gameType];
                    
                    button.setAttribute('data-value', gameType);
                    button.classList.remove('mixed', 'male', 'female');
                    button.classList.add(gameType);
                    
                    console.log(`✅ 복원: 타임${time} 코트${court} = ${gameType}`);
                }
            }
        }
    }
    
    console.log('🎯 게임 타입 복원 완료');
    
    // 복원 후 카운터 업데이트
    updateGameTypeCounter();
}

// 현재 멤버 구성으로 자동 입력
function autoFillGameTypes() {
    if (!appState.tempMeeting?.members) {
        alert('멤버 정보가 없습니다. 1단계에서 멤버를 먼저 등록해주세요.');
        return;
    }
    
    const members = appState.tempMeeting.members;
    const courtCount = parseInt(document.getElementById('court-count').value);
    const timeCount = parseInt(document.getElementById('time-count').value);
    const totalGames = courtCount * timeCount;
    
    // 멤버 성별 분석
    const maleCount = members.filter(m => m.gender === '남').length;
    const femaleCount = members.filter(m => m.gender === '여').length;
    const anyGenderCount = members.filter(m => m.gender === '상관없음').length;
    
    console.log('👥 멤버 구성 분석:', { 남성: maleCount, 여성: femaleCount, 상관없음: anyGenderCount });
    
    // 최적 복식 속성 결정 로직
    const gameTypes = determineOptimalGameTypes(totalGames, maleCount, femaleCount, anyGenderCount);
    
    // 게임 타입을 화면에 반영
    applyGameTypesToUI(gameTypes, courtCount, timeCount);
    
    // tempMeeting에 저장
    if (!appState.tempMeeting.gameTypes) {
        appState.tempMeeting.gameTypes = [];
    }
    appState.tempMeeting.gameTypes = [...gameTypes];
    
    // 카운터 업데이트
    updateGameTypeCounter();
    
    console.log('✅ 자동 입력 완료:', gameTypes);
    alert('현재 멤버 구성에 맞게 복식 속성이 자동으로 설정되었습니다!');
}

// 최적 복식 속성 결정
function determineOptimalGameTypes(totalGames, maleCount, femaleCount, anyGenderCount) {
    const gameTypes = [];
    
    // 실제 사용 가능한 성별별 인원 계산 (상관없음 포함)
    const effectiveMaleCount = maleCount + anyGenderCount;
    const effectiveFemaleCount = femaleCount + anyGenderCount;
    
    console.log('📊 유효 인원:', { 
        실제남성: maleCount, 
        실제여성: femaleCount, 
        상관없음: anyGenderCount,
        유효남성: effectiveMaleCount, 
        유효여성: effectiveFemaleCount 
    });
    
    // 각 성별로 최소 4명 이상 필요
    const canMale = effectiveMaleCount >= 4;
    const canFemale = effectiveFemaleCount >= 4;
    const canMixed = (maleCount + anyGenderCount >= 2) && (femaleCount + anyGenderCount >= 2);
    
    // 게임 타입별 우선순위 결정
    let maleGames = 0;
    let femaleGames = 0;
    let mixedGames = 0;
    
    if (canMale && canFemale && canMixed) {
        // 모든 타입 가능: 균형있게 배분
        const baseGamesPerType = Math.floor(totalGames / 3);
        maleGames = baseGamesPerType;
        femaleGames = baseGamesPerType;
        mixedGames = totalGames - maleGames - femaleGames; // 나머지는 혼복
    } else if (canMale && canFemale && !canMixed) {
        // 남복, 여복만 가능
        maleGames = Math.ceil(totalGames / 2);
        femaleGames = totalGames - maleGames;
        mixedGames = 0;
    } else if (canMixed) {
        // 혼복 위주 (다른 조합 불가능한 경우)
        mixedGames = totalGames;
        if (canMale) {
            const malePortin = Math.floor(totalGames * 0.3);
            maleGames = Math.min(malePortin, Math.floor(effectiveMaleCount / 4));
            mixedGames -= maleGames;
        }
        if (canFemale && mixedGames > 0) {
            const femalePortin = Math.floor(totalGames * 0.3);
            femaleGames = Math.min(femalePortin, Math.floor(effectiveFemaleCount / 4));
            mixedGames -= femaleGames;
        }
    } else {
        // 기본: 혼복만 (최소 조건)
        mixedGames = totalGames;
    }
    
    console.log('🎯 결정된 게임 배분:', { 남복: maleGames, 여복: femaleGames, 혼복: mixedGames });
    
    // 게임 타입 배열 생성
    for (let i = 0; i < maleGames; i++) gameTypes.push('male');
    for (let i = 0; i < femaleGames; i++) gameTypes.push('female');
    for (let i = 0; i < mixedGames; i++) gameTypes.push('mixed');
    
    // 무작위 섞기
    for (let i = gameTypes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameTypes[i], gameTypes[j]] = [gameTypes[j], gameTypes[i]];
    }
    
    return gameTypes;
}

// 게임 타입을 UI에 적용
function applyGameTypesToUI(gameTypes, courtCount, timeCount) {
    const gameTypeTexts = {
        'mixed': '혼복 (남녀 혼합)',
        'male': '남복 (남성끼리)', 
        'female': '여복 (여성끼리)'
    };
    
    for (let time = 1; time <= timeCount; time++) {
        for (let court = 1; court <= courtCount; court++) {
            const gameIndex = (time - 1) * courtCount + (court - 1);
            const gameType = gameTypes[gameIndex];
            
            if (gameType) {
                const button = document.querySelector(`[data-time="${time}"][data-court="${court}"]`);
                if (button) {
                    const selectedType = button.querySelector('.selected-type');
                    selectedType.textContent = gameTypeTexts[gameType];
                    
                    button.setAttribute('data-value', gameType);
                    button.classList.remove('mixed', 'male', 'female');
                    button.classList.add(gameType);
                }
            }
        }
    }
}

// 게임 타입별 개수 카운터 업데이트
function updateGameTypeCounter() {
    const maleCountElement = document.getElementById('male-count');
    const femaleCountElement = document.getElementById('female-count');
    const mixedCountElement = document.getElementById('mixed-count');
    
    if (!maleCountElement || !femaleCountElement || !mixedCountElement) {
        return; // 카운터 요소가 없으면 종료 (다른 모드일 수 있음)
    }
    
    let maleCount = 0;
    let femaleCount = 0;
    let mixedCount = 0;
    
    // 현재 화면에서 선택된 게임 타입들 카운트
    const gameButtons = document.querySelectorAll('.game-type-button[data-value]');
    gameButtons.forEach(button => {
        const gameType = button.getAttribute('data-value');
        switch (gameType) {
            case 'male':
                maleCount++;
                break;
            case 'female':
                femaleCount++;
                break;
            case 'mixed':
                mixedCount++;
                break;
        }
    });
    
    // 화면에 반영
    maleCountElement.textContent = maleCount;
    femaleCountElement.textContent = femaleCount;
    mixedCountElement.textContent = mixedCount;
    
    // 색상으로 시각적 구분
    updateCounterColors(maleCountElement, maleCount);
    updateCounterColors(femaleCountElement, femaleCount);
    updateCounterColors(mixedCountElement, mixedCount);
}

// 카운터 색상 업데이트
function updateCounterColors(element, count) {
    element.style.color = count > 0 ? '#007bff' : '#6c757d';
}