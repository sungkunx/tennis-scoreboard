// 새로운 복식 테니스 대진표 알고리즘
// 우선순위: 1) 금지조합 방지 2) 게임수 균형 3) 성별 구성 4) 실력 균형

// 전역 조합 추적 시스템 (같은 조합 방지)
let usedCombinations = new Set();
let currentBracketId = null;

// 조합 키 생성 함수 (팀 순서 무관하게 일관된 키 생성)
function getCombinationKey(team1, team2) {
    // 각 팀을 정렬하고, 두 팀도 정렬해서 순서 무관하게 만듦
    const sortedTeam1 = team1.map(p => p.name).sort();
    const sortedTeam2 = team2.map(p => p.name).sort();
    
    // 두 팀 중 사전순으로 앞서는 팀을 먼저 배치
    const teams = [sortedTeam1.join(','), sortedTeam2.join(',')].sort();
    return teams.join(' vs ');
}

// 새로운 조합인지 확인
function isNewCombination(team1, team2) {
    const key = getCombinationKey(team1, team2);
    const isNew = !usedCombinations.has(key);
    
    if (isNew) {
        console.log('✅ 새로운 조합:', key);
    } else {
        console.log('❌ 중복 조합 감지:', key);
    }
    
    return isNew;
}

// 조합 등록
function registerCombination(team1, team2) {
    const key = getCombinationKey(team1, team2);
    usedCombinations.add(key);
    console.log('📝 조합 등록:', key);
}

// 대진표 시작 시 조합 추적 초기화
function initializeCombinationTracking(bracketId) {
    currentBracketId = bracketId;
    usedCombinations.clear();
    console.log('🔄 조합 추적 초기화:', bracketId);
}

// 비율 기반 게임 타입 분배 계산 (3단계 케이스)
function calculateGameTypeDistribution(maleCount, femaleCount, totalGames) {
    console.log('📊 게임 타입 분배 계산:', { 남성: maleCount, 여성: femaleCount, 총게임: totalGames });
    
    const totalPlayers = maleCount + femaleCount;
    const maleRatio = maleCount / totalPlayers;
    const femaleRatio = femaleCount / totalPlayers;
    
    let distribution = {
        남복: 0,
        여복: 0, 
        혼복: 0,
        case: ''
    };
    
    // 케이스 1: 특정 성별 < 4명, 반대 성별 ≥ 4명
    if (maleCount < 4 && femaleCount >= 4) {
        distribution.case = '케이스1: 남성부족';
        // 여복과 혼복만 가능
        const basicFemaleGames = Math.floor(totalGames * femaleRatio);
        const basicMixedGames = Math.floor(totalGames * maleRatio);
        
        distribution.여복 = basicFemaleGames;
        distribution.혼복 = basicMixedGames;
        
        // 플레이어 게임수 균형 체크 및 조정
        const balance = checkPlayerGameBalance(distribution, maleCount, femaleCount);
        if (balance.needsAdjustment) {
            distribution = adjustMixedGamesWithLimit(distribution, balance, totalGames);
        }
        
    } else if (femaleCount < 4 && maleCount >= 4) {
        distribution.case = '케이스1: 여성부족';
        // 남복과 혼복만 가능
        const basicMaleGames = Math.floor(totalGames * maleRatio);
        const basicMixedGames = Math.floor(totalGames * femaleRatio);
        
        distribution.남복 = basicMaleGames;
        distribution.혼복 = basicMixedGames;
        
        // 플레이어 게임수 균형 체크 및 조정
        const balance = checkPlayerGameBalance(distribution, maleCount, femaleCount);
        if (balance.needsAdjustment) {
            distribution = adjustMixedGamesWithLimit(distribution, balance, totalGames);
        }
        
    } else if (maleCount >= 4 && femaleCount >= 4) {
        distribution.case = '케이스2: 양쪽충분';
        // 기본 비율 분배
        const basicMaleGames = Math.floor(totalGames * maleRatio);
        const basicFemaleGames = Math.floor(totalGames * femaleRatio);
        
        // 25% 혼복 전환
        const mixedConversion = Math.floor(totalGames * 0.25);
        const maleReduction = Math.floor(mixedConversion * maleRatio);
        const femaleReduction = Math.floor(mixedConversion * femaleRatio);
        
        distribution.남복 = Math.max(0, basicMaleGames - maleReduction);
        distribution.여복 = Math.max(0, basicFemaleGames - femaleReduction);
        distribution.혼복 = maleReduction + femaleReduction;
        
        // 나머지 게임 처리
        const remaining = totalGames - distribution.남복 - distribution.여복 - distribution.혼복;
        if (remaining > 0) {
            distribution.혼복 += remaining;
        }
        
        // 플레이어 게임수 균형 체크 및 조정
        const balance = checkPlayerGameBalance(distribution, maleCount, femaleCount);
        if (balance.needsAdjustment) {
            distribution = adjustMixedGamesWithLimit(distribution, balance, totalGames);
        }
        
    } else {
        distribution.case = '케이스3: 양쪽부족';
        // 모든 게임을 혼복으로
        distribution.혼복 = totalGames;
    }
    
    console.log('📊 최종 게임 타입 분배:', distribution);
    return distribution;
}

// 플레이어 게임수 균형 체크
function checkPlayerGameBalance(distribution, maleCount, femaleCount) {
    const maleGameParticipation = (distribution.남복 * 4) + (distribution.혼복 * 2);
    const femaleGameParticipation = (distribution.여복 * 4) + (distribution.혼복 * 2);
    
    const maleAvgGames = maleGameParticipation / maleCount;
    const femaleAvgGames = femaleGameParticipation / femaleCount;
    
    const difference = Math.abs(maleAvgGames - femaleAvgGames);
    const needsAdjustment = difference > 0.5;
    
    console.log('⚖️ 게임수 균형 체크:', {
        남성평균: maleAvgGames.toFixed(2),
        여성평균: femaleAvgGames.toFixed(2),
        차이: difference.toFixed(2),
        조정필요: needsAdjustment
    });
    
    return {
        maleAvgGames,
        femaleAvgGames,
        difference,
        needsAdjustment,
        maleShortage: maleAvgGames < femaleAvgGames ? femaleAvgGames - maleAvgGames : 0,
        femaleShortage: femaleAvgGames < maleAvgGames ? maleAvgGames - femaleAvgGames : 0
    };
}

// 혼복 조정 (35% 이하 제한)
function adjustMixedGamesWithLimit(distribution, balance, totalGames) {
    const MAX_MIXED_RATIO = 0.35;
    const maxMixedGames = Math.floor(totalGames * MAX_MIXED_RATIO);
    
    console.log('🔧 혼복 조정 시작:', { 현재혼복: distribution.혼복, 최대허용: maxMixedGames });
    
    let adjusted = { ...distribution };
    
    // 혼복을 늘려서 균형을 맞추려 하지만 40% 이하로 제한
    if (balance.maleShortage > 0) {
        // 남성 게임수 부족 - 여복을 혼복으로 전환
        const conversionNeeded = Math.ceil(balance.maleShortage * adjusted.여복 / 4);
        const actualConversion = Math.min(conversionNeeded, adjusted.여복, maxMixedGames - adjusted.혼복);
        
        adjusted.여복 -= actualConversion;
        adjusted.혼복 += actualConversion;
        
    } else if (balance.femaleShortage > 0) {
        // 여성 게임수 부족 - 남복을 혼복으로 전환
        const conversionNeeded = Math.ceil(balance.femaleShortage * adjusted.남복 / 4);
        const actualConversion = Math.min(conversionNeeded, adjusted.남복, maxMixedGames - adjusted.혼복);
        
        adjusted.남복 -= actualConversion;
        adjusted.혼복 += actualConversion;
    }
    
    console.log('🔧 혼복 조정 완료:', adjusted);
    return adjusted;
}

// 메인 대진표 생성 함수
function createRandomBracket(members, courtCount, timeCount, genderSeparate, skillBalance) {
    console.log('🎾 새로운 대진표 알고리즘 시작:', { 
        멤버수: members.length, 
        코트수: courtCount, 
        타임수: timeCount, 
        성별구분: genderSeparate, 
        실력균형: skillBalance 
    });

    // 조합 추적 시스템 초기화
    const bracketId = `${Date.now()}_${members.length}명`;
    initializeCombinationTracking(bracketId);

    const games = [];
    const totalGames = courtCount * timeCount;
    
    // 각 멤버의 게임 수 추적
    const memberGameCount = {};
    members.forEach(member => {
        memberGameCount[member.name] = 0;
    });

    // 성별 구분 모드일 때 비율 기반 게임 타입 분배 계산
    let gameTypeDistribution = null;
    if (genderSeparate) {
        const males = members.filter(m => m.gender === '남');
        const females = members.filter(m => m.gender === '여');
        gameTypeDistribution = calculateGameTypeDistribution(males.length, females.length, totalGames);
        console.log('📊 게임 타입 분배:', gameTypeDistribution);
    }

    for (let time = 1; time <= timeCount; time++) {
        // 현재 타임에 이미 배정된 플레이어들
        const currentTimeMembers = games
            .filter(g => g.time === time)
            .flatMap(g => [...(g.team1 || []), ...(g.team2 || [])]);

        for (let court = 1; court <= courtCount; court++) {
            const gameId = `T${time}-C${court}`;
            
            // 현재 타임에 아직 배정되지 않은 가용 플레이어들
            const availableMembers = members.filter(member =>
                !currentTimeMembers.find(tm => tm.name === member.name)
            );

            if (availableMembers.length >= 4) {
                // 비율 기반 팀 선택 또는 기존 방식
                const teams = genderSeparate && gameTypeDistribution ? 
                    selectTeamsWithRatioDistribution(availableMembers, memberGameCount, skillBalance, gameTypeDistribution, games.length) :
                    selectOptimalTeamsWithDiversityCheck(availableMembers, memberGameCount, genderSeparate, skillBalance);
                
                if (teams && validateTeamCombination(teams.team1, teams.team2) && isNewCombination(teams.team1, teams.team2)) {
                    // 조합 등록
                    registerCombination(teams.team1, teams.team2);
                    
                    games.push({
                        id: gameId,
                        time: time,
                        court: court,
                        team1: teams.team1,
                        team2: teams.team2,
                        teamType: getTeamType(teams.team1, teams.team2),
                        score1: null,
                        score2: null,
                        completed: false
                    });
                    
                    // 현재 타임 멤버에 추가
                    currentTimeMembers.push(...teams.team1, ...teams.team2);
                    
                    // 게임 수 증가
                    [...teams.team1, ...teams.team2].forEach(member => {
                        memberGameCount[member.name]++;
                    });
                    
                    console.log(`✅ ${gameId} 생성:`, {
                        team1: teams.team1.map(m => `${m.name}(${m.gender})`),
                        team2: teams.team2.map(m => `${m.name}(${m.gender})`),
                        teamType: getTeamType(teams.team1, teams.team2)
                    });
                } else {
                    console.log(`❌ ${gameId} 생성 실패 (중복 조합 또는 금지 조합)`);
                }
            }
        }
    }
    
    console.log('🎾 대진표 생성 완료:', { 총게임수: games.length, 게임수현황: memberGameCount });
    
    return {
        games,
        memberGameCount,
        settings: { genderSeparate, skillBalance, courtCount, timeCount }
    };
}

// 성별 그룹화 및 중립 플레이어 동적 배정
function groupPlayersByGender(members, genderSeparate) {
    const males = members.filter(m => m.gender === '남');
    const females = members.filter(m => m.gender === '여');
    const neutrals = members.filter(m => m.gender === '상관없음');
    
    console.log('👥 초기 성별 분포:', { 남성: males.length, 여성: females.length, 중립: neutrals.length });
    
    if (!genderSeparate || neutrals.length === 0) {
        return { males, females, neutrals };
    }
    
    // 전체 균형을 위한 중립 플레이어 배정
    const totalPlayers = members.length;
    const idealMales = Math.floor(totalPlayers / 2);
    const idealFemales = totalPlayers - idealMales;
    
    const currentMales = males.length;
    const currentFemales = females.length;
    
    const assignedMales = [...males];
    const assignedFemales = [...females];
    const remainingNeutrals = [...neutrals];
    
    // 부족한 쪽에 우선 배정
    while (remainingNeutrals.length > 0) {
        if (assignedMales.length < idealMales && assignedMales.length <= assignedFemales.length) {
            assignedMales.push(remainingNeutrals.shift());
        } else if (assignedFemales.length < idealFemales) {
            assignedFemales.push(remainingNeutrals.shift());
        } else {
            // 균형이 맞으면 번갈아 배정
            if (assignedMales.length <= assignedFemales.length) {
                assignedMales.push(remainingNeutrals.shift());
            } else {
                assignedFemales.push(remainingNeutrals.shift());
            }
        }
    }
    
    console.log('👥 중립 배정 후:', { 남성: assignedMales.length, 여성: assignedFemales.length });
    
    return { 
        males: assignedMales, 
        females: assignedFemales, 
        neutrals: [] 
    };
}

// 중복 조합 방지를 고려한 최적 팀 선택
function selectOptimalTeamsWithDiversityCheck(availableMembers, memberGameCount, genderSeparate, skillBalance) {
    console.log('🎯 중복 방지 팀 선택 시작:', { 
        가용멤버수: availableMembers.length,
        멤버들: availableMembers.map(m => `${m.name}(${m.gender},게임${memberGameCount[m.name] || 0})`)
    });
    
    if (availableMembers.length < 4) return null;

    // 게임수 기준으로 정렬 (적게 한 사람 우선)
    const sortedByGames = [...availableMembers].sort((a, b) => {
        const gamesA = memberGameCount[a.name] || 0;
        const gamesB = memberGameCount[b.name] || 0;
        if (gamesA !== gamesB) return gamesA - gamesB;
        // 게임수가 같으면 실력으로 정렬 (균형을 위해)
        return Math.abs(a.skill - 5) - Math.abs(b.skill - 5);
    });

    // 여러 조합을 시도해서 중복되지 않은 조합 찾기
    const maxAttempts = 20; // 최대 시도 횟수
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let teams;
        
        if (genderSeparate) {
            // 현재 생성된 게임 수를 전달 (다양성을 위해)
            const currentGameCount = Object.values(memberGameCount).reduce((sum, count) => sum + count, 0) / 4;
            teams = selectTeamsByGenderNew(sortedByGames, memberGameCount, skillBalance, currentGameCount + attempt);
        } else {
            teams = selectTeamsRandomNew(sortedByGames, memberGameCount, skillBalance);
        }
        
        if (teams && validateTeamCombination(teams.team1, teams.team2)) {
            // 중복 조합 체크
            if (isNewCombination(teams.team1, teams.team2)) {
                console.log(`✅ 새로운 조합 발견 (시도 ${attempt + 1}):`, {
                    team1: teams.team1.map(m => m.name),
                    team2: teams.team2.map(m => m.name)
                });
                return teams;
            } else {
                console.log(`🔄 중복 조합으로 재시도 (시도 ${attempt + 1})`);
                // 다음 시도를 위해 약간의 랜덤성 추가
                sortedByGames.sort(() => Math.random() - 0.5);
            }
        }
    }
    
    console.log('❌ 새로운 조합을 찾지 못함 (모든 시도 완료)');
    return null;
}

// 기존 최적 팀 선택 (게임수 균형 + 실력 고려)
function selectOptimalTeams(availableMembers, memberGameCount, genderSeparate, skillBalance) {
    console.log('🎯 최적 팀 선택 시작:', { 
        가용멤버수: availableMembers.length,
        멤버들: availableMembers.map(m => `${m.name}(${m.gender},게임${memberGameCount[m.name] || 0})`)
    });
    
    if (availableMembers.length < 4) return null;

    // 게임수 기준으로 정렬 (적게 한 사람 우선)
    const sortedByGames = [...availableMembers].sort((a, b) => {
        const gamesA = memberGameCount[a.name] || 0;
        const gamesB = memberGameCount[b.name] || 0;
        if (gamesA !== gamesB) return gamesA - gamesB;
        // 게임수가 같으면 실력으로 정렬 (균형을 위해)
        return Math.abs(a.skill - 5) - Math.abs(b.skill - 5);
    });

    if (genderSeparate) {
        // 현재 생성된 게임 수를 전달 (다양성을 위해)
        const currentGameCount = Object.values(memberGameCount).reduce((sum, count) => sum + count, 0) / 4;
        return selectTeamsByGenderNew(sortedByGames, memberGameCount, skillBalance, currentGameCount);
    } else {
        return selectTeamsRandomNew(sortedByGames, memberGameCount, skillBalance);
    }
}

// 성별 구분 팀 선택 (새 알고리즘 - 다양성 개선)
function selectTeamsByGenderNew(sortedMembers, memberGameCount, skillBalance, gameCount = 0) {
    const males = sortedMembers.filter(m => m.gender === '남');
    const females = sortedMembers.filter(m => m.gender === '여');
    
    console.log('⚤ 성별 구분 매칭:', { 남성수: males.length, 여성수: females.length, 게임수: gameCount });
    
    // 1순위: 남복 시도 (다양성 개선)
    if (males.length >= 4) {
        const selectedMales = selectDiversePlayers(males, 4, gameCount, '남성');
        const teams = createBalancedTeams(selectedMales, skillBalance);
        if (teams && validateTeamCombination(teams.team1, teams.team2)) {
            console.log('🔵 남복 생성 성공 (다양성 적용)');
            return teams;
        }
    }
    
    // 2순위: 여복 시도 (다양성 개선)
    if (females.length >= 4) {
        const selectedFemales = selectDiversePlayers(females, 4, gameCount, '여성');
        const teams = createBalancedTeams(selectedFemales, skillBalance);
        if (teams && validateTeamCombination(teams.team1, teams.team2)) {
            console.log('🔴 여복 생성 성공 (다양성 적용)');
            return teams;
        }
    }
    
    // 3순위: 혼복 시도 (남여:남여)
    if (males.length >= 2 && females.length >= 2) {
        const selectedMales = males.slice(0, 2);
        const selectedFemales = females.slice(0, 2);
        const mixedTeam1 = [selectedMales[0], selectedFemales[0]];
        const mixedTeam2 = [selectedMales[1], selectedFemales[1]];
        
        if (validateTeamCombination(mixedTeam1, mixedTeam2)) {
            let finalTeams = { team1: mixedTeam1, team2: mixedTeam2 };
            
            // 실력 균형 조정
            if (skillBalance) {
                finalTeams = balanceSkillsNew([...selectedMales, ...selectedFemales], finalTeams);
            }
            
            console.log('🟡 혼복 생성 성공');
            return finalTeams;
        }
    }
    
    console.log('❌ 성별 구분 매칭 실패');
    return null;
}

// 랜덤 팀 선택 (새 알고리즘 - 다중 시도 + 백트래킹)
function selectTeamsRandomNew(sortedMembers, memberGameCount, skillBalance) {
    console.log('🎲 랜덤 매칭 시도 (유연한 방식)');
    
    if (sortedMembers.length < 4) return null;
    
    // 1단계: 후보 풀 확장 (게임수 적은 4-8명을 후보로)
    const candidatePoolSize = Math.min(8, sortedMembers.length);
    const candidatePool = sortedMembers.slice(0, candidatePoolSize);
    console.log(`🎯 후보 풀: ${candidatePool.length}명`, candidatePool.map(m => `${m.name}(게임${memberGameCount[m.name] || 0})`));
    
    // 2단계: 후보 풀에서 가능한 모든 4명 조합 생성
    const playerCombinations = generatePlayerCombinations(candidatePool, 4, memberGameCount);
    console.log(`🔄 총 ${playerCombinations.length}개의 4명 조합 생성`);
    
    // 3단계: 각 4명 조합에 대해 팀 구성 시도
    for (let i = 0; i < playerCombinations.length; i++) {
        const players = playerCombinations[i];
        console.log(`🎲 조합 ${i + 1} 시도:`, players.map(p => `${p.name}(${p.gender})`));
        
        // 이 4명으로 가능한 모든 팀 구성 방식 시도
        const teamResult = tryAllTeamCombinations(players, skillBalance);
        
        if (teamResult) {
            console.log('✅ 랜덤 매칭 성공 (유연한 방식)');
            return teamResult;
        }
    }
    
    console.log('❌ 랜덤 매칭 실패 (모든 조합 시도 완료)');
    return null;
}

// 4명에서 가능한 모든 팀 구성 방식 시도
function tryAllTeamCombinations(players, skillBalance) {
    if (players.length !== 4) return null;
    
    // 가능한 모든 팀 구성 방식
    const teamCombinations = [
        { team1: [players[0], players[1]], team2: [players[2], players[3]] },
        { team1: [players[0], players[2]], team2: [players[1], players[3]] },
        { team1: [players[0], players[3]], team2: [players[1], players[2]] }
    ];
    
    let bestCombination = null;
    let minSkillDifference = Infinity;
    
    for (const combo of teamCombinations) {
        if (validateTeamCombination(combo.team1, combo.team2)) {
            console.log('✅ 유효한 팀 조합 발견:', {
                team1: combo.team1.map(m => `${m.name}(${m.gender})`),
                team2: combo.team2.map(m => `${m.name}(${m.gender})`)
            });
            
            if (skillBalance) {
                // 실력 균형을 고려한 최적 조합 선택
                const skill1 = calculateTeamSkill(combo.team1[0], combo.team1[1]);
                const skill2 = calculateTeamSkill(combo.team2[0], combo.team2[1]);
                const skillDifference = Math.abs(skill1 - skill2);
                
                if (skillDifference < minSkillDifference) {
                    minSkillDifference = skillDifference;
                    bestCombination = combo;
                }
            } else {
                // 실력 균형 미고려시 첫 번째 유효한 조합 선택
                return combo;
            }
        }
    }
    
    if (bestCombination) {
        console.log('⚖️ 실력 균형 고려한 최적 조합 선택:', { 실력차: minSkillDifference });
    }
    
    return bestCombination;
}

// n명에서 r명을 선택하는 모든 조합 생성
function generatePlayerCombinations(players, r, memberGameCount) {
    if (r > players.length) return [];
    if (r === 1) return players.map(p => [p]);
    
    const combinations = [];
    
    function backtrack(start, currentCombination) {
        if (currentCombination.length === r) {
            combinations.push([...currentCombination]);
            return;
        }
        
        for (let i = start; i < players.length; i++) {
            currentCombination.push(players[i]);
            backtrack(i + 1, currentCombination);
            currentCombination.pop();
        }
    }
    
    backtrack(0, []);
    
    // 게임수 기준으로 조합 정렬 (게임수 총합이 적은 조합 우선)
    combinations.sort((a, b) => {
        const sumA = a.reduce((sum, player) => sum + (memberGameCount[player.name] || 0), 0);
        const sumB = b.reduce((sum, player) => sum + (memberGameCount[player.name] || 0), 0);
        return sumA - sumB;
    });
    
    return combinations;
}

// 비율 기반 팀 선택 (새로운 메인 로직)
function selectTeamsWithRatioDistribution(availableMembers, memberGameCount, skillBalance, gameTypeDistribution, currentGameIndex) {
    console.log(`🎯 비율 기반 팀 선택 (게임 ${currentGameIndex + 1}):`, gameTypeDistribution);
    
    const males = availableMembers.filter(m => m.gender === '남');
    const females = availableMembers.filter(m => m.gender === '여');
    
    // 현재까지 생성된 게임 타입별 개수 계산
    const gameTypeCounts = {
        남복: 0,
        여복: 0,
        혼복: 0
    };
    
    // 현재 필요한 게임 타입 결정 (우선순위 기반)
    const targetGameType = determineNextGameType(gameTypeDistribution, currentGameIndex);
    console.log(`🎯 목표 게임 타입: ${targetGameType}`);
    
    // 목표 타입에 따라 팀 생성
    switch (targetGameType) {
        case '남복':
            if (males.length >= 4) {
                const selectedMales = selectDiversePlayers(males, 4, currentGameIndex, '남성');
                const teams = createBalancedTeams(selectedMales, skillBalance);
                if (teams && validateTeamCombination(teams.team1, teams.team2)) {
                    console.log('🔵 비율 기반 남복 생성 성공');
                    return teams;
                }
            }
            // 남복 실패 시 다른 타입으로 폴백
            return tryFallbackGameType(availableMembers, memberGameCount, skillBalance, currentGameIndex, '남복');
            
        case '여복':
            if (females.length >= 4) {
                const selectedFemales = selectDiversePlayers(females, 4, currentGameIndex, '여성');
                const teams = createBalancedTeams(selectedFemales, skillBalance);
                if (teams && validateTeamCombination(teams.team1, teams.team2)) {
                    console.log('🔴 비율 기반 여복 생성 성공');
                    return teams;
                }
            }
            // 여복 실패 시 다른 타입으로 폴백
            return tryFallbackGameType(availableMembers, memberGameCount, skillBalance, currentGameIndex, '여복');
            
        case '혼복':
            if (males.length >= 2 && females.length >= 2) {
                const selectedMales = males.slice(0, 2);
                const selectedFemales = females.slice(0, 2);
                const mixedTeam1 = [selectedMales[0], selectedFemales[0]];
                const mixedTeam2 = [selectedMales[1], selectedFemales[1]];
                
                if (validateTeamCombination(mixedTeam1, mixedTeam2)) {
                    let finalTeams = { team1: mixedTeam1, team2: mixedTeam2 };
                    
                    // 실력 균형 조정
                    if (skillBalance) {
                        finalTeams = balanceSkillsNew([...selectedMales, ...selectedFemales], finalTeams);
                    }
                    
                    console.log('🟡 비율 기반 혼복 생성 성공');
                    return finalTeams;
                }
            }
            // 혼복 실패 시 다른 타입으로 폴백
            return tryFallbackGameType(availableMembers, memberGameCount, skillBalance, currentGameIndex, '혼복');
            
        default:
            console.log('❌ 알 수 없는 게임 타입');
            return null;
    }
}

// 다음 게임 타입 결정 (분배 비율에 따라)
function determineNextGameType(gameTypeDistribution, currentGameIndex) {
    const totalGames = gameTypeDistribution.남복 + gameTypeDistribution.여복 + gameTypeDistribution.혼복;
    
    // 게임 타입별 비율 계산
    const ratios = {
        남복: gameTypeDistribution.남복 / totalGames,
        여복: gameTypeDistribution.여복 / totalGames,
        혼복: gameTypeDistribution.혼복 / totalGames
    };
    
    // 현재 게임 인덱스를 기준으로 어떤 타입이 필요한지 결정
    const gamePosition = (currentGameIndex + 1) / totalGames;
    
    if (gamePosition <= ratios.남복) {
        return '남복';
    } else if (gamePosition <= ratios.남복 + ratios.여복) {
        return '여복';
    } else {
        return '혼복';
    }
}

// 폴백 게임 타입 시도
function tryFallbackGameType(availableMembers, memberGameCount, skillBalance, currentGameIndex, failedType) {
    console.log(`🔄 ${failedType} 실패, 폴백 시도`);
    
    const males = availableMembers.filter(m => m.gender === '남');
    const females = availableMembers.filter(m => m.gender === '여');
    
    // 실패한 타입을 제외하고 가능한 타입들을 순서대로 시도
    const fallbackOrder = ['혼복', '남복', '여복'].filter(type => type !== failedType);
    
    for (const gameType of fallbackOrder) {
        switch (gameType) {
            case '남복':
                if (males.length >= 4) {
                    const selectedMales = selectDiversePlayers(males, 4, currentGameIndex, '남성');
                    const teams = createBalancedTeams(selectedMales, skillBalance);
                    if (teams && validateTeamCombination(teams.team1, teams.team2)) {
                        console.log(`🔵 폴백 남복 생성 성공`);
                        return teams;
                    }
                }
                break;
                
            case '여복':
                if (females.length >= 4) {
                    const selectedFemales = selectDiversePlayers(females, 4, currentGameIndex, '여성');
                    const teams = createBalancedTeams(selectedFemales, skillBalance);
                    if (teams && validateTeamCombination(teams.team1, teams.team2)) {
                        console.log(`🔴 폴백 여복 생성 성공`);
                        return teams;
                    }
                }
                break;
                
            case '혼복':
                if (males.length >= 2 && females.length >= 2) {
                    const selectedMales = males.slice(0, 2);
                    const selectedFemales = females.slice(0, 2);
                    const mixedTeam1 = [selectedMales[0], selectedFemales[0]];
                    const mixedTeam2 = [selectedMales[1], selectedFemales[1]];
                    
                    if (validateTeamCombination(mixedTeam1, mixedTeam2)) {
                        let finalTeams = { team1: mixedTeam1, team2: mixedTeam2 };
                        
                        if (skillBalance) {
                            finalTeams = balanceSkillsNew([...selectedMales, ...selectedFemales], finalTeams);
                        }
                        
                        console.log(`🟡 폴백 혼복 생성 성공`);
                        return finalTeams;
                    }
                }
                break;
        }
    }
    
    console.log('❌ 모든 폴백 시도 실패');
    return null;
}

// 다양성을 고려한 플레이어 선택 (회전 선택 + 스마트 셔플)
function selectDiversePlayers(players, count, gameCount, genderType) {
    if (players.length < count) return players.slice(0, count);
    
    console.log(`🔄 ${genderType} 다양성 선택:`, { 
        가용인원: players.length, 
        필요인원: count, 
        게임수: gameCount,
        플레이어들: players.map(p => p.name)
    });
    
    // 1단계: 회전 선택 (Rotation Selection)
    // 게임 수에 따라 시작 인덱스를 회전시켜 항상 다른 사람부터 시작
    const candidatePoolSize = Math.min(8, players.length); // 후보 풀 크기
    const rotationIndex = Math.floor(gameCount) % players.length;
    
    // 회전된 순서로 후보 풀 생성
    const rotatedPlayers = [
        ...players.slice(rotationIndex),
        ...players.slice(0, rotationIndex)
    ].slice(0, candidatePoolSize);
    
    console.log(`🔄 회전 선택 (인덱스 ${rotationIndex}):`, rotatedPlayers.map(p => p.name));
    
    // 2단계: 스마트 셔플 (Smart Shuffle)
    // 게임수 균형을 유지하면서도 조합에 변화 추가
    const shuffledCandidates = smartShuffle(rotatedPlayers, gameCount);
    
    console.log(`🎲 스마트 셔플 후:`, shuffledCandidates.map(p => p.name));
    
    // 최종 선택
    const selected = shuffledCandidates.slice(0, count);
    console.log(`✅ 최종 선택된 ${genderType}:`, selected.map(p => p.name));
    
    return selected;
}

// 스마트 셔플: 게임수 균형을 유지하면서 적당한 랜덤성 추가
function smartShuffle(players, gameCount) {
    const shuffled = [...players];
    
    // 게임 수에 따라 셔플 강도 조절
    const shuffleIntensity = Math.floor(gameCount) % 3; // 0, 1, 2 중 하나
    
    switch (shuffleIntensity) {
        case 0:
            // 약한 셔플: 인접한 2개씩만 교환
            for (let i = 0; i < shuffled.length - 1; i += 2) {
                if (i + 1 < shuffled.length && Math.random() > 0.5) {
                    [shuffled[i], shuffled[i + 1]] = [shuffled[i + 1], shuffled[i]];
                }
            }
            console.log('🎲 약한 셔플 적용');
            break;
            
        case 1:
            // 중간 셔플: 절반씩 교환
            const mid = Math.floor(shuffled.length / 2);
            for (let i = 0; i < mid; i++) {
                if (Math.random() > 0.5) {
                    const swapIndex = mid + (i % (shuffled.length - mid));
                    [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
                }
            }
            console.log('🎲 중간 셔플 적용');
            break;
            
        case 2:
            // 강한 셔플: Fisher-Yates 일부 적용
            for (let i = shuffled.length - 1; i > shuffled.length / 2; i--) {
                if (Math.random() > 0.3) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
            }
            console.log('🎲 강한 셔플 적용');
            break;
    }
    
    return shuffled;
}

// 실력 균형을 고려한 팀 생성
function createBalancedTeams(players, skillBalance) {
    if (players.length !== 4) return null;
    
    if (!skillBalance) {
        // 실력 균형 미고려시 순서대로 배정
        return {
            team1: [players[0], players[1]],
            team2: [players[2], players[3]]
        };
    }
    
    // 모든 가능한 조합 시도하여 최적 실력 균형 찾기
    const combinations = [
        { team1: [players[0], players[1]], team2: [players[2], players[3]] },
        { team1: [players[0], players[2]], team2: [players[1], players[3]] },
        { team1: [players[0], players[3]], team2: [players[1], players[2]] }
    ];
    
    let bestCombination = combinations[0];
    let minDifference = Infinity;
    
    for (const combo of combinations) {
        if (validateTeamCombination(combo.team1, combo.team2)) {
            const skill1 = calculateTeamSkill(combo.team1[0], combo.team1[1]);
            const skill2 = calculateTeamSkill(combo.team2[0], combo.team2[1]);
            const difference = Math.abs(skill1 - skill2);
            
            if (difference < minDifference) {
                minDifference = difference;
                bestCombination = combo;
            }
        }
    }
    
    console.log('⚖️ 실력 균형 조정:', { 
        최종실력차: minDifference,
        team1합계: calculateTeamSkill(bestCombination.team1[0], bestCombination.team1[1]),
        team2합계: calculateTeamSkill(bestCombination.team2[0], bestCombination.team2[1])
    });
    
    return bestCombination;
}

// 혼복 팀의 실력 균형 재조정
function balanceSkillsNew(players, currentTeams) {
    if (players.length !== 4) return currentTeams;
    
    const males = players.filter(p => p.gender === '남');
    const females = players.filter(p => p.gender === '여');
    
    if (males.length !== 2 || females.length !== 2) return currentTeams;
    
    // 가능한 혼복 조합들
    const combinations = [
        { team1: [males[0], females[0]], team2: [males[1], females[1]] },
        { team1: [males[0], females[1]], team2: [males[1], females[0]] }
    ];
    
    let bestCombination = currentTeams;
    let minDifference = Infinity;
    
    for (const combo of combinations) {
        const skill1 = calculateTeamSkill(combo.team1[0], combo.team1[1]);
        const skill2 = calculateTeamSkill(combo.team2[0], combo.team2[1]);
        const difference = Math.abs(skill1 - skill2);
        
        if (difference < minDifference) {
            minDifference = difference;
            bestCombination = combo;
        }
    }
    
    return bestCombination;
}

// validateTeamCombination은 utils.js에서 사용

// 팀 실력 계산
function calculateTeamSkill(member1, member2) {
    return member1.skill + member2.skill;
}

// 팀 타입 결정 (기존 함수 유지)
function getTeamType(team1, team2) {
    if (!Array.isArray(team1) || !Array.isArray(team2) || team1.length !== 2 || team2.length !== 2) {
        console.error('getTeamType: Invalid team data', { team1, team2 });
        return '혼복';
    }
    
    const team1Genders = team1.map(m => m.gender).sort();
    const team2Genders = team2.map(m => m.gender).sort();
    
    const team1Type = team1Genders.join('');
    const team2Type = team2Genders.join('');
    
    if (team1Type === '남남' && team2Type === '남남') {
        return '남복';
    }
    
    if (team1Type === '여여' && team2Type === '여여') {
        return '여복';  
    }
    
    if (team1Type === '남여' && team2Type === '남여') {
        return '혼복';
    }
    
    return '혼복';
}

// 대진표 재생성
function regenerateBracket() {
    if (confirm('현재 대진표를 다시 생성하시겠습니까?')) {
        console.log('🔄 대진표 재생성 시작');
        
        // 조합 추적 초기화 (새로운 조합 허용)
        if (currentBracketId) {
            initializeCombinationTracking(currentBracketId + '_regenerated');
        }
        
        // meeting.js의 generateBracket 호출
        if (typeof generateBracket === 'function') {
            generateBracket();
        } else {
            console.error('generateBracket 함수를 찾을 수 없습니다');
            // 직접 재생성 시도
            if (appState.tempMeeting && appState.tempMeeting.settings) {
                const settings = appState.tempMeeting.settings;
                const newBracket = createRandomBracket(
                    appState.tempMeeting.members,
                    settings.courtCount,
                    settings.timeCount,
                    settings.genderSeparate,
                    settings.skillBalance
                );
                
                if (newBracket) {
                    appState.tempMeeting.bracket = newBracket;
                    // 대진표 화면 새로고침
                    if (typeof showBracketScreen === 'function') {
                        showBracketScreen();
                    }
                }
            }
        }
    }
}

// Manual 브래킷용 조합 유효성 체크
function isValidCombination(combination, bracketId) {
    const exists = usedCombinations.has(combination);
    return !exists;
}

// Manual 브래킷용 조합 기록
function recordCombination(combination, bracketId) {
    usedCombinations.add(combination);
}