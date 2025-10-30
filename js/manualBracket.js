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

    // 전체 조정사항 추적
    let globalAdjustments = [];
    
    // 타임별 게임 생성 및 선수 배정
    for (let time = 1; time <= timeCount; time++) {
        console.log(`\n🏓 타임 ${time} 게임 생성 시작`);
        
        // 현재 타임의 게임 타입들 추출
        const timeGameTypes = [];
        for (let court = 1; court <= courtCount; court++) {
            const gameIndex = (time - 1) * courtCount + (court - 1);
            timeGameTypes.push(gameTypes[gameIndex]);
        }
        
        // 타임별 게임 타입 검증 및 자동 조정
        const { adjustedTypes, adjustments } = adjustGameTypesForAvailability(
            timeGameTypes, maleMembers, femaleMembers, anyGenderMembers
        );
        
        if (adjustments.length > 0) {
            globalAdjustments.push(`타임 ${time}: ${adjustments.join(', ')}`);
        }
        
        // 타임별 멤버 풀 생성
        const timeMemberPool = createTimeMemberPool(maleMembers, femaleMembers, anyGenderMembers);
        
        // 각 코트별 게임 생성
        for (let court = 1; court <= courtCount; court++) {
            const adjustedGameType = adjustedTypes[court - 1];
            
            console.log(`🎯 타임 ${time} 코트 ${court} (${adjustedGameType}) 팀 생성 시작`);
            
            // 현재 풀에서 사용 가능한 멤버들 가져오기
            const availableMembers = timeMemberPool.getAvailableForGameType(adjustedGameType);
            
            if (availableMembers.length < 4) {
                console.warn(`❌ 타임 ${time} 코트 ${court}: 사용 가능한 멤버 부족 (${availableMembers.length}명)`);
                continue;
            }
            
            // 팀 생성 (풀별 전용 함수 사용)
            const teams = createTeamsFromPool(
                adjustedGameType, availableMembers, memberGameCount, 
                timeMemberPool, maleMembers, femaleMembers, anyGenderMembers
            );
            
            if (!teams) {
                console.warn(`❌ 타임 ${time} 코트 ${court} (${adjustedGameType}) 팀 생성 실패`);
                continue;
            }
            
            // 사용된 멤버들을 풀에서 제거
            const usedMembers = [...teams.team1, ...teams.team2];
            timeMemberPool.removeMembersFromPool(usedMembers);
            
            console.log(`✅ 타임 ${time} 코트 ${court} 팀 생성 완료:`, {
                팀1: teams.team1.map(m => m.name),
                팀2: teams.team2.map(m => m.name),
                남은멤버수: {
                    남성: timeMemberPool.male.length,
                    여성: timeMemberPool.female.length,
                    상관없음: timeMemberPool.any.length
                }
            });

            const game = {
                id: `${time}-${court}`,
                time: time,
                court: court,
                team1: teams.team1,
                team2: teams.team2,
                score: { team1: 0, team2: 0 },
                status: 'pending',
                gameType: adjustedGameType
            };
            
            games.push(game);
            
            // 게임 수 카운트 업데이트
            teams.team1.forEach(member => memberGameCount[member.name]++);
            teams.team2.forEach(member => memberGameCount[member.name]++);
        }
    }
    
    // 자동 조정이 있었다면 사용자에게 알림
    if (globalAdjustments.length > 0) {
        const adjustmentMessage = `일부 게임 타입이 자동으로 조정되었습니다:\n\n${globalAdjustments.join('\n')}\n\n멤버 구성상 불가능한 조합을 방지하기 위한 자동 조정입니다.`;
        setTimeout(() => {
            alert(adjustmentMessage);
        }, 100);
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

// 타임별 게임 타입 조합 검증
function validateTimeGameTypes(timeGameTypes, maleMembers, femaleMembers, anyGenderMembers) {
    let requiredMales = 0;
    let requiredFemales = 0;
    
    timeGameTypes.forEach(gameType => {
        switch(gameType) {
            case 'male': 
                requiredMales += 4; 
                break;
            case 'female': 
                requiredFemales += 4; 
                break;
            case 'mixed': 
                requiredMales += 2; 
                requiredFemales += 2; 
                break;
        }
    });
    
    const availableMales = maleMembers.length + anyGenderMembers.length;
    const availableFemales = femaleMembers.length + anyGenderMembers.length;
    
    const valid = requiredMales <= availableMales && requiredFemales <= availableFemales;
    
    console.log(`🔍 타임 검증:`, {
        게임타입: timeGameTypes,
        필요남성: requiredMales,
        필요여성: requiredFemales,
        사용가능남성: availableMales,
        사용가능여성: availableFemales,
        유효성: valid ? '✅' : '❌'
    });
    
    return {
        valid,
        requiredMales, 
        requiredFemales, 
        availableMales, 
        availableFemales
    };
}

// 게임 타입 자동 조정 (물리적 불가능한 조합 해결)
function adjustGameTypesForAvailability(timeGameTypes, maleMembers, femaleMembers, anyGenderMembers) {
    const adjustedTypes = [...timeGameTypes];
    let adjustments = [];
    
    // 최대 5번 조정 시도
    for (let attempt = 0; attempt < 5; attempt++) {
        const validation = validateTimeGameTypes(adjustedTypes, maleMembers, femaleMembers, anyGenderMembers);
        
        if (validation.valid) {
            if (adjustments.length > 0) {
                console.log('🔧 게임 타입 자동 조정 완료:', adjustments);
            }
            return { adjustedTypes, adjustments };
        }
        
        // 조정 전략: 부족한 성별의 게임을 혼복으로 변경
        let adjusted = false;
        
        if (validation.requiredFemales > validation.availableFemales) {
            // 여성 부족: 여복을 혼복으로 변경
            for (let i = 0; i < adjustedTypes.length; i++) {
                if (adjustedTypes[i] === 'female') {
                    adjustedTypes[i] = 'mixed';
                    adjustments.push(`${i+1}번째 게임: 여복 → 혼복 (여성 부족)`);
                    adjusted = true;
                    break;
                }
            }
        }
        
        if (!adjusted && validation.requiredMales > validation.availableMales) {
            // 남성 부족: 남복을 혼복으로 변경
            for (let i = 0; i < adjustedTypes.length; i++) {
                if (adjustedTypes[i] === 'male') {
                    adjustedTypes[i] = 'mixed';
                    adjustments.push(`${i+1}번째 게임: 남복 → 혼복 (남성 부족)`);
                    adjusted = true;
                    break;
                }
            }
        }
        
        if (!adjusted) {
            // 더 이상 조정할 수 없음
            break;
        }
    }
    
    return { adjustedTypes, adjustments };
}

// 타임별 멤버 풀 생성
function createTimeMemberPool(maleMembers, femaleMembers, anyGenderMembers) {
    return {
        male: [...maleMembers],
        female: [...femaleMembers], 
        any: [...anyGenderMembers],
        
        // 게임 타입별 사용 가능한 멤버 반환
        getAvailableForGameType(gameType) {
            switch(gameType) {
                case 'male':
                    return [...this.male, ...this.any];
                case 'female':
                    return [...this.female, ...this.any];
                case 'mixed':
                    return [...this.male, ...this.female, ...this.any];
                default:
                    return [];
            }
        },
        
        // 사용된 멤버들 풀에서 제거
        removeMembersFromPool(usedMembers) {
            usedMembers.forEach(member => {
                this.male = this.male.filter(m => m.name !== member.name);
                this.female = this.female.filter(m => m.name !== member.name);
                this.any = this.any.filter(m => m.name !== member.name);
            });
        }
    };
}

// 타임별 멤버 풀에서 팀 생성
function createTeamsFromPool(gameType, availableMembers, memberGameCount, timeMemberPool, maleMembers, femaleMembers, anyGenderMembers) {
    console.log(`🎯 풀에서 ${gameType} 팀 생성 시작 (사용 가능 멤버: ${availableMembers.length}명)`);
    
    if (availableMembers.length < 4) {
        return null;
    }
    
    // 혼복의 경우 성별 균형을 고려한 특별 처리
    if (gameType === 'mixed') {
        return createMixedTeamsFromPool(availableMembers, memberGameCount, timeMemberPool);
    } else {
        // 남복/여복의 경우 새로운 조합 찾기 로직 사용
        return findBestManualTeamCombination(availableMembers, memberGameCount);
    }
}

// 풀에서 혼복 팀 생성 (성별 균형 고려)
function createMixedTeamsFromPool(availableMembers, memberGameCount, timeMemberPool) {
    const maleAvailable = timeMemberPool.male.concat(timeMemberPool.any);
    const femaleAvailable = timeMemberPool.female.concat(timeMemberPool.any);
    
    // 최소 남녀 각각 2명씩 필요
    if (maleAvailable.length < 2 || femaleAvailable.length < 2) {
        console.warn('풀에서 혼복 게임을 위한 남녀 멤버가 부족합니다');
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
            console.log('✨ 새로운 풀 혼복 조합 사용:', key);
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
    console.log(`🔄 풀 혼복 조합 재사용 (${manualUsedCombinations.get(key)}번째):`, key);
    
    return bestCombo;
}

// 타임별 게임 타입 검증 및 자동 조정 (자동 입력 버튼용)
function validateAndAdjustGameTypesByTime(gameTypes, courtCount, timeCount, maleMembers, femaleMembers, anyGenderMembers) {
    const adjustedGameTypes = [...gameTypes];
    let totalAdjustments = [];
    
    console.log('🔍 타임별 게임 타입 검증 시작');
    
    // 각 타임별로 검증 및 조정
    for (let time = 1; time <= timeCount; time++) {
        // 현재 타임의 게임 타입들 추출
        const timeGameTypes = [];
        for (let court = 1; court <= courtCount; court++) {
            const gameIndex = (time - 1) * courtCount + (court - 1);
            timeGameTypes.push(adjustedGameTypes[gameIndex]);
        }
        
        console.log(`🏓 타임 ${time} 검증:`, timeGameTypes);
        
        // 타임별 게임 타입 검증 및 자동 조정
        const { adjustedTypes, adjustments } = adjustGameTypesForAvailability(
            timeGameTypes, maleMembers, femaleMembers, anyGenderMembers
        );
        
        if (adjustments.length > 0) {
            totalAdjustments.push(`타임 ${time}: ${adjustments.join(', ')}`);
            
            // 조정된 게임 타입을 전체 배열에 반영
            for (let court = 1; court <= courtCount; court++) {
                const gameIndex = (time - 1) * courtCount + (court - 1);
                adjustedGameTypes[gameIndex] = adjustedTypes[court - 1];
            }
            
            console.log(`🔧 타임 ${time} 조정 결과:`, adjustedTypes);
        }
    }
    
    if (totalAdjustments.length > 0) {
        console.log('📋 전체 자동 조정 결과:', totalAdjustments);
    }
    
    return { 
        adjustedGameTypes, 
        totalAdjustments 
    };
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
    const conditionSettings = document.getElementById('condition-settings');
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    const gameTypeDistributionSection = document.getElementById('game-type-distribution-section');

    if (conditionSettings) {
        conditionSettings.innerHTML = `
            <label class="form-label">조건 설정</label>
            <div class="checkbox-group">
                <label class="checkbox-option" id="skill-balance-option">
                    <input type="checkbox" id="skill-balance">
                    <span>실력 구분 (가능한 상대팀은 실력이 비슷하게 설정)</span>
                </label>
            </div>
            <p class="info-text" id="condition-info">* 셀프 대진표에서는 각 게임의 복식 속성을 직접 선택합니다</p>
        `;
    }

    // 게임 타입 분배 섹션 숨김 (셀프 대진표는 수동 선택)
    if (gameTypeDistributionSection) {
        gameTypeDistributionSection.style.display = 'none';
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
    const gameTypeDistributionSection = document.getElementById('game-type-distribution-section');

    if (conditionSettings) {
        conditionSettings.innerHTML = `
            <label class="form-label">조건 설정</label>
            <div class="checkbox-group">
                <label class="checkbox-option" id="skill-balance-option">
                    <input type="checkbox" id="skill-balance">
                    <span>실력 균형 (비슷한 실력끼리 매칭)</span>
                </label>
            </div>
            <p class="info-text" id="condition-info">* 다음 단계에서 대진표가 나오면 수정이 가능합니다</p>
        `;
    }

    // 게임 타입 분배 섹션 표시 및 HTML 재구성
    if (gameTypeDistributionSection) {
        gameTypeDistributionSection.style.display = 'block';
        // 모바일 친화적 레이아웃으로 재구성
        const gameTypeDistribution = document.getElementById('game-type-distribution');
        if (gameTypeDistribution) {
            gameTypeDistribution.innerHTML = `
                <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div id="member-gender-summary" style="color: #666; font-size: 0.9em;">
                        남성 0명, 여성 0명
                    </div>
                    <button type="button" onclick="autoCalculateDistribution()" style="padding: 8px 16px; font-size: 0.9em; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🔄 자동 계산</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 18px;">
                    <!-- 남복 -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <label style="font-weight: 600; font-size: 1em; color: #333;">남복</label>
                            <span id="male-games-constraint" style="color: #999; font-size: 0.85em;">(최대 0)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button type="button" onclick="decrementGameCount('male-games')" style="flex: 0 0 48px; height: 48px; background: #f8f9fa; border: 2px solid #ddd; border-radius: 8px; font-size: 1.5em; font-weight: bold; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
                            <input type="number" id="male-games" min="0" value="0" onchange="updateGameTypeDistribution()" oninput="updateGameTypeDistribution()" style="flex: 1; height: 48px; padding: 0 12px; border: 2px solid #007bff; border-radius: 8px; text-align: center; font-size: 1.3em; font-weight: 600; color: #333;">
                            <button type="button" onclick="incrementGameCount('male-games')" style="flex: 0 0 48px; height: 48px; background: #007bff; border: 2px solid #007bff; border-radius: 8px; font-size: 1.5em; font-weight: bold; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                            <span style="flex: 0 0 40px; color: #666; font-size: 0.95em;">게임</span>
                        </div>
                    </div>
                    <!-- 여복 -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <label style="font-weight: 600; font-size: 1em; color: #333;">여복</label>
                            <span id="female-games-constraint" style="color: #999; font-size: 0.85em;">(최대 0)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button type="button" onclick="decrementGameCount('female-games')" style="flex: 0 0 48px; height: 48px; background: #f8f9fa; border: 2px solid #ddd; border-radius: 8px; font-size: 1.5em; font-weight: bold; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
                            <input type="number" id="female-games" min="0" value="0" onchange="updateGameTypeDistribution()" oninput="updateGameTypeDistribution()" style="flex: 1; height: 48px; padding: 0 12px; border: 2px solid #007bff; border-radius: 8px; text-align: center; font-size: 1.3em; font-weight: 600; color: #333;">
                            <button type="button" onclick="incrementGameCount('female-games')" style="flex: 0 0 48px; height: 48px; background: #007bff; border: 2px solid #007bff; border-radius: 8px; font-size: 1.5em; font-weight: bold; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                            <span style="flex: 0 0 40px; color: #666; font-size: 0.95em;">게임</span>
                        </div>
                    </div>
                    <!-- 혼복 -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <label style="font-weight: 600; font-size: 1em; color: #007bff;">혼복</label>
                            <span style="color: #007bff; font-size: 0.85em;">(자동 계산)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="flex: 1; height: 48px; padding: 0 12px; border: 2px solid #ddd; border-radius: 8px; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                                <span id="mixed-games" style="font-size: 1.3em; font-weight: 600; color: #666;">0</span>
                            </div>
                            <span style="flex: 0 0 40px; color: #666; font-size: 0.95em;">게임</span>
                        </div>
                    </div>
                </div>
                <div id="distribution-validation" style="margin-top: 15px; padding: 10px; border-radius: 6px; font-size: 0.9em;">
                    ✅ 유효한 분배입니다
                </div>
            `;
        }
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

    // 게임 타입 분배 자동 계산 (약간의 지연 후 DOM이 준비된 후)
    setTimeout(() => {
        if (typeof autoCalculateDistribution === 'function') {
            autoCalculateDistribution();
        }
    }, 100);
}

// KDK 모드 설정 (수동 브래킷 설정 숨김)
function setupKDKMode() {
    const conditionSettings = document.getElementById('condition-settings');
    const manualBracketSettings = document.getElementById('manual-bracket-settings');
    const gameTypeDistributionSection = document.getElementById('game-type-distribution-section');

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

    // 게임 타입 분배 섹션 숨김 (KDK는 고정 알고리즘)
    if (gameTypeDistributionSection) {
        gameTypeDistributionSection.style.display = 'none';
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
    
    // 멤버 성별별 분류
    const maleMembers = members.filter(m => m.gender === '남');
    const femaleMembers = members.filter(m => m.gender === '여');
    const anyGenderMembers = members.filter(m => m.gender === '상관없음');
    
    console.log('👥 멤버 구성 분석:', { 
        남성: maleMembers.length, 
        여성: femaleMembers.length, 
        상관없음: anyGenderMembers.length 
    });
    
    // 초기 게임 타입 결정
    let gameTypes = determineOptimalGameTypes(totalGames, maleMembers.length, femaleMembers.length, anyGenderMembers.length);
    console.log('📋 초기 게임 타입 결정:', gameTypes);
    
    // 타임별 검증 및 자동 조정 적용
    const { adjustedGameTypes, totalAdjustments } = validateAndAdjustGameTypesByTime(
        gameTypes, courtCount, timeCount, maleMembers, femaleMembers, anyGenderMembers
    );
    
    gameTypes = adjustedGameTypes;
    
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
    
    // 사용자 알림 (자동 조정이 있었다면 포함)
    let message = '현재 멤버 구성에 맞게 복식 속성이 자동으로 설정되었습니다!';
    if (totalAdjustments.length > 0) {
        message += '\n\n일부 게임 타입이 자동으로 조정되었습니다:\n' + totalAdjustments.join('\n') + '\n\n멤버 구성상 불가능한 조합을 방지하기 위한 자동 조정입니다.';
    }
    
    alert(message);
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