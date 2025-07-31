// 셀프 대진표 생성 관련 기능들

// 수동 대진표 생성 (복식 속성 지정 + 자동 선수 배정)
function createManualBracket(members, courtCount, timeCount, gameTypes) {
    console.log('🎾 수동 대진표 생성 시작:', { 
        멤버수: members.length, 
        코트수: courtCount, 
        타임수: timeCount, 
        게임타입: gameTypes 
    });

    // 조합 추적 시스템 초기화
    const bracketId = `manual_${Date.now()}_${members.length}명`;
    initializeCombinationTracking(bracketId);

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

// 게임 타입에 따른 팀 생성
function createTeamsForGameType(gameType, maleMembers, femaleMembers, anyGenderMembers, memberGameCount, bracketId) {
    let availableMembers = [];
    
    // 게임 타입에 따른 사용 가능한 멤버 설정
    switch (gameType) {
        case 'male':
            // 남복: 남성 + 상관없음 멤버들
            availableMembers = [...maleMembers, ...anyGenderMembers];
            break;
        case 'female':
            // 여복: 여성 + 상관없음 멤버들
            availableMembers = [...femaleMembers, ...anyGenderMembers];
            break;
        case 'mixed':
            // 혼복: 모든 멤버 사용 가능
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
    
    // 게임 수가 적은 멤버들을 우선 선택
    availableMembers.sort((a, b) => {
        const gameCountA = memberGameCount[a.name] || 0;
        const gameCountB = memberGameCount[b.name] || 0;
        if (gameCountA !== gameCountB) {
            return gameCountA - gameCountB; // 게임 수가 적은 순
        }
        return Math.random() - 0.5; // 같으면 랜덤
    });
    
    // 팀 구성 시도
    const maxAttempts = 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const team1 = [];
        const team2 = [];
        const usedMembers = new Set();
        
        // 혼복인 경우 성별 균형을 고려한 팀 구성
        if (gameType === 'mixed') {
            if (!createMixedTeams(availableMembers, team1, team2, usedMembers, memberGameCount)) {
                continue; // 재시도
            }
        } else {
            // 남복/여복인 경우 단순 선택
            if (!createSameGenderTeams(availableMembers, team1, team2, usedMembers, memberGameCount)) {
                continue; // 재시도
            }
        }
        
        // 조합 중복 체크
        const combination = createCombinationKey([...team1, ...team2]);
        if (!isValidCombination(combination, bracketId)) {
            continue; // 중복이면 재시도
        }
        
        // 성공적으로 팀 구성 완료
        recordCombination(combination, bracketId);
        return { team1, team2 };
    }
    
    console.warn(`${gameType} 게임 팀 구성 실패 (${maxAttempts}회 시도)`);
    return null;
}

// 혼복 팀 구성 (성별 균형 고려)
function createMixedTeams(availableMembers, team1, team2, usedMembers, memberGameCount) {
    const males = availableMembers.filter(m => m.gender === '남' || m.gender === '상관없음');
    const females = availableMembers.filter(m => m.gender === '여' || m.gender === '상관없음');
    
    // 각 팀에 남녀 1명씩 배정 시도
    try {
        // 팀1에 남성 1명
        const male1 = selectBestMember(males.filter(m => !usedMembers.has(m.name)), memberGameCount);
        if (!male1) return false;
        team1.push(male1);
        usedMembers.add(male1.name);
        
        // 팀1에 여성 1명
        const female1 = selectBestMember(females.filter(m => !usedMembers.has(m.name)), memberGameCount);
        if (!female1) return false;
        team1.push(female1);
        usedMembers.add(female1.name);
        
        // 팀2에 남성 1명
        const male2 = selectBestMember(males.filter(m => !usedMembers.has(m.name)), memberGameCount);
        if (!male2) return false;
        team2.push(male2);
        usedMembers.add(male2.name);
        
        // 팀2에 여성 1명
        const female2 = selectBestMember(females.filter(m => !usedMembers.has(m.name)), memberGameCount);
        if (!female2) return false;
        team2.push(female2);
        usedMembers.add(female2.name);
        
        return true;
    } catch (error) {
        return false;
    }
}

// 같은 성별 팀 구성 (남복/여복)
function createSameGenderTeams(availableMembers, team1, team2, usedMembers, memberGameCount) {
    try {
        // 4명을 순서대로 선택 (게임 수가 적은 순)
        for (let i = 0; i < 4; i++) {
            const member = selectBestMember(availableMembers.filter(m => !usedMembers.has(m.name)), memberGameCount);
            if (!member) return false;
            
            if (i < 2) {
                team1.push(member);
            } else {
                team2.push(member);
            }
            usedMembers.add(member.name);
        }
        return true;
    } catch (error) {
        return false;
    }
}

// 최적의 멤버 선택 (게임 수가 가장 적은 멤버)
function selectBestMember(candidates, memberGameCount) {
    if (candidates.length === 0) return null;
    
    candidates.sort((a, b) => {
        const gameCountA = memberGameCount[a.name] || 0;
        const gameCountB = memberGameCount[b.name] || 0;
        if (gameCountA !== gameCountB) {
            return gameCountA - gameCountB;
        }
        return Math.random() - 0.5;
    });
    
    return candidates[0];
}

// 조합 키 생성 (기존 bracket.js 함수 활용)
function createCombinationKey(members) {
    return members.map(m => m.name).sort().join('|');
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
    }, 50);
}

// 수동 모드 설정
function setupManualMode() {
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
    const bracketType = document.querySelector('input[name="bracket-type"]:checked').value;
    
    if (bracketType === 'kdk') {
        setupKDKMode();
    } else if (bracketType === 'manual') {
        setupManualMode();
    } else {
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
}