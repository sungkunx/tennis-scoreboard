// 새로운 복식 테니스 대진표 알고리즘
// 우선순위: 1) 개별 대전 빈도 최소화 2) 게임수 균형 3) 성별 구성 4) 실력 균형

// 전역 조합 추적 시스템 (같은 조합 방지)
let usedCombinations = new Set();
let currentBracketId = null;

// 개별 대전 빈도 추적 시스템 (새로운 추가)
let playerMatchupCount = {}; // { "선수A vs 선수B": 횟수 }

// 팀메이트 빈도 추적 시스템 (같은 팀 구성 방지)
let teammateCount = {}; // { "선수A,선수B": 횟수 }

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
    playerMatchupCount = {}; // 개별 대전 빈도도 초기화
    teammateCount = {}; // 팀메이트 빈도도 초기화
    console.log('🔄 조합 추적 초기화 (대전 빈도 + 팀메이트 빈도):', bracketId);
}

// 개별 대전 매치업 키 생성 (두 선수 간 대전)
function getMatchupKey(player1, player2) {
    const names = [player1.name, player2.name].sort();
    return names.join(' vs ');
}

// 팀메이트 키 생성 (같은 팀 구성)
function getTeammateKey(player1, player2) {
    const names = [player1.name, player2.name].sort();
    return names.join(',');
}

// 두 팀 간 모든 개별 대전 빈도 합계 계산
function calculateMatchupScore(team1, team2) {
    let totalMatchups = 0;
    // 팀1의 각 선수가 팀2의 각 선수와 몇 번 대전했는지 합산
    for (const p1 of team1) {
        for (const p2 of team2) {
            const key = getMatchupKey(p1, p2);
            totalMatchups += (playerMatchupCount[key] || 0);
        }
    }
    return totalMatchups; // 낮을수록 새로운 매치업
}

// 두 팀의 팀메이트 반복 빈도 합계 계산
function calculateTeammateScore(team1, team2) {
    let totalTeammates = 0;

    // team1의 팀메이트 빈도
    if (team1.length === 2) {
        const key = getTeammateKey(team1[0], team1[1]);
        totalTeammates += (teammateCount[key] || 0);
    }

    // team2의 팀메이트 빈도
    if (team2.length === 2) {
        const key = getTeammateKey(team2[0], team2[1]);
        totalTeammates += (teammateCount[key] || 0);
    }

    return totalTeammates; // 낮을수록 새로운 팀 구성
}

// 게임 생성 후 개별 대전 빈도 등록
function registerMatchups(team1, team2) {
    for (const p1 of team1) {
        for (const p2 of team2) {
            const key = getMatchupKey(p1, p2);
            playerMatchupCount[key] = (playerMatchupCount[key] || 0) + 1;
        }
    }

    // 로그 출력 (상위 5개만)
    const sortedMatchups = Object.entries(playerMatchupCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    console.log('📊 개별 대전 빈도 (상위 5):', sortedMatchups);
}

// 게임 생성 후 팀메이트 빈도 등록
function registerTeammates(team1, team2) {
    // team1 팀메이트 등록
    if (team1.length === 2) {
        const key = getTeammateKey(team1[0], team1[1]);
        teammateCount[key] = (teammateCount[key] || 0) + 1;
    }

    // team2 팀메이트 등록
    if (team2.length === 2) {
        const key = getTeammateKey(team2[0], team2[1]);
        teammateCount[key] = (teammateCount[key] || 0) + 1;
    }

    // 로그 출력 (상위 5개만)
    const sortedTeammates = Object.entries(teammateCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    console.log('🤝 팀메이트 빈도 (상위 5):', sortedTeammates);
}

// 게임 수 불균형 계산
function calculateGameImbalance(team1, team2, memberGameCount) {
    const allPlayers = [...team1, ...team2];
    const gameCounts = allPlayers.map(p => memberGameCount[p.name] || 0);
    const maxGames = Math.max(...gameCounts);
    const minGames = Math.min(...gameCounts);
    return maxGames - minGames; // 차이가 작을수록 좋음
}

// 종합 점수 기반 매치업 평가 (높을수록 좋은 조합)
function evaluateMatchup(team1, team2, memberGameCount, skillBalance, genderSeparate) {
    let score = 1000; // 기본 점수

    // 1) 팀메이트 반복 방지 (최우선) - 50% 가중치
    const teammateFrequency = calculateTeammateScore(team1, team2);
    score -= teammateFrequency * 200; // 같은 팀 반복 시 큰 감점

    // 2) 대전 상대 다양성 - 30% 가중치
    const matchupFrequency = calculateMatchupScore(team1, team2);
    score -= matchupFrequency * 80; // 이전 대전이 많을수록 감점

    // 3) 게임 수 균형 - 15% 가중치
    const gameImbalance = calculateGameImbalance(team1, team2, memberGameCount);
    score -= gameImbalance * 30;

    // 4) 실력 균형 - 10% 가중치 (skillBalance 옵션 켜져있을 때만)
    if (skillBalance) {
        const skill1 = calculateTeamSkill(team1[0], team1[1]);
        const skill2 = calculateTeamSkill(team2[0], team2[1]);
        const skillDiff = Math.abs(skill1 - skill2);
        score -= skillDiff * 8;
    }

    // 5) 성별 구성 보너스 - 5% 가중치 (genderSeparate 옵션 켜져있을 때만)
    if (genderSeparate) {
        const teamType = getTeamType(team1, team2);
        // 같은 성별끼리 매칭된 경우 보너스
        if (teamType === '남복' || teamType === '여복') {
            score += 20;
        }
    }

    return score;
}

// 여러 후보 중 최적 팀 조합 선택
function selectBestMatchup(candidates, memberGameCount, skillBalance, genderSeparate) {
    if (candidates.length === 0) return null;

    let bestCandidates = [];  // 동점인 후보들을 모두 저장
    let bestScore = -Infinity;

    for (const candidate of candidates) {
        const score = evaluateMatchup(
            candidate.team1,
            candidate.team2,
            memberGameCount,
            skillBalance,
            genderSeparate
        );

        console.log('📊 후보 평가:', {
            team1: candidate.team1.map(p => p.name),
            team2: candidate.team2.map(p => p.name),
            점수: score.toFixed(1)
        });

        if (score > bestScore) {
            // 더 좋은 점수 발견 - 리스트 초기화
            bestScore = score;
            bestCandidates = [candidate];
        } else if (score === bestScore) {
            // 동점 - 리스트에 추가
            bestCandidates.push(candidate);
        }
    }

    // 동점인 후보들 중 랜덤 선택
    const selectedIndex = Math.floor(Math.random() * bestCandidates.length);
    const bestCandidate = bestCandidates[selectedIndex];

    console.log('✅ 최적 조합 선택:', {
        team1: bestCandidate.team1.map(p => p.name),
        team2: bestCandidate.team2.map(p => p.name),
        최종점수: bestScore.toFixed(1),
        동점후보수: bestCandidates.length
    });

    return bestCandidate;
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
function createRandomBracket(members, courtCount, timeCount, genderSeparate, skillBalance, manualDistribution = null) {
    console.log('🎾 새로운 대진표 알고리즘 시작:', {
        멤버수: members.length,
        코트수: courtCount,
        타임수: timeCount,
        성별구분: genderSeparate,
        실력균형: skillBalance,
        수동분배: manualDistribution
    });

    // 조합 추적 시스템 초기화
    const bracketId = `${Date.now()}_${members.length}명`;
    initializeCombinationTracking(bracketId);

    // 게임 타입 카운터 초기화
    actualGameTypeCounts = {
        남복: 0,
        여복: 0,
        혼복: 0
    };

    const games = [];
    const totalGames = courtCount * timeCount;

    // 각 멤버의 게임 수 추적
    const memberGameCount = {};
    members.forEach(member => {
        memberGameCount[member.name] = 0;
    });

    // 성별 구분 모드일 때 게임 타입 분배 결정
    let gameTypeDistribution = null;
    if (genderSeparate) {
        // 수동 분배가 있으면 우선 사용, 없으면 자동 계산
        if (manualDistribution) {
            gameTypeDistribution = manualDistribution;
            console.log('📊 수동 게임 타입 분배 적용:', gameTypeDistribution);
        } else {
            const males = members.filter(m => m.gender === '남');
            const females = members.filter(m => m.gender === '여');
            gameTypeDistribution = calculateGameTypeDistribution(males.length, females.length, totalGames);
            console.log('📊 자동 게임 타입 분배:', gameTypeDistribution);
        }
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
                let teams = null;
                let attempts = 0;
                const maxAttempts = 3;

                // 여러 번 시도
                while (!teams && attempts < maxAttempts) {
                    attempts++;

                    // 목표 게임 수 체크
                    const totalTargetGames = gameTypeDistribution ?
                        (gameTypeDistribution.남복 + gameTypeDistribution.여복 + gameTypeDistribution.혼복) : 0;
                    const targetReached = gameTypeDistribution && games.length >= totalTargetGames;

                    // 비율 기반 팀 선택 또는 기존 방식
                    // 목표 도달 시에는 게임 타입 제약 없이 생성
                    teams = (genderSeparate && gameTypeDistribution && !targetReached) ?
                        selectTeamsWithRatioDistribution(availableMembers, memberGameCount, skillBalance, gameTypeDistribution, games.length) :
                        selectOptimalTeamsWithDiversityCheck(availableMembers, memberGameCount, genderSeparate, skillBalance);

                    if (targetReached && attempts === 1) {
                        console.log(`ℹ️ ${gameId}: 목표 게임 수 도달, 제약 없이 생성`);
                    }

                    // 검증
                    if (teams && validateTeamCombination(teams.team1, teams.team2) && isNewCombination(teams.team1, teams.team2)) {
                        // 성공!
                        break;
                    } else {
                        // 실패 시 다시 시도 (다른 조합)
                        teams = null;
                    }
                }

                if (teams) {
                    // 조합 등록
                    registerCombination(teams.team1, teams.team2);
                    // 개별 대전 빈도 등록
                    registerMatchups(teams.team1, teams.team2);
                    // 팀메이트 빈도 등록
                    registerTeammates(teams.team1, teams.team2);

                    const actualType = getTeamType(teams.team1, teams.team2);

                    // 실제 생성된 게임 타입 카운터 증가
                    if (actualType === '남복') actualGameTypeCounts.남복++;
                    else if (actualType === '여복') actualGameTypeCounts.여복++;
                    else if (actualType === '혼복') actualGameTypeCounts.혼복++;

                    games.push({
                        id: gameId,
                        time: time,
                        court: court,
                        team1: teams.team1,
                        team2: teams.team2,
                        teamType: actualType,
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

                    console.log(`✅ ${gameId} 생성 (시도 ${attempts}회):`, {
                        team1: teams.team1.map(m => `${m.name}(${m.gender})`),
                        team2: teams.team2.map(m => `${m.name}(${m.gender})`),
                        teamType: actualType
                    });
                } else {
                    console.log(`❌ ${gameId} 생성 실패 (${maxAttempts}회 시도 후 포기)`);
                }
            } else {
                console.log(`⚠️ ${gameId} 건너뜀 (가용 선수 부족: ${availableMembers.length}명)`);
            }
        }
    }
    
    console.log('🎾 대진표 생성 완료:', {
        총게임수: games.length,
        게임수현황: memberGameCount,
        게임타입분포: actualGameTypeCounts
    });

    if (gameTypeDistribution) {
        console.log('📊 목표 vs 실제:');
        console.log('  목표:', gameTypeDistribution);
        console.log('  실제:', actualGameTypeCounts);
    }

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

// 중복 조합 방지를 고려한 최적 팀 선택 (단순화된 점수 기반)
function selectOptimalTeamsWithDiversityCheck(availableMembers, memberGameCount, genderSeparate, skillBalance) {
    console.log('🎯 점수 기반 팀 선택 시작:', {
        가용멤버수: availableMembers.length,
        멤버들: availableMembers.map(m => `${m.name}(${m.gender},게임${memberGameCount[m.name] || 0})`)
    });

    if (availableMembers.length < 4) return null;

    // 1단계: Fisher-Yates 셔플 후 게임수 기준으로 정렬
    // 먼저 완전 랜덤 섞기 (Fisher-Yates)
    const shuffled = [...availableMembers];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 그 다음 게임수로 안정 정렬
    const sortedByGames = shuffled.sort((a, b) => {
        const gamesA = memberGameCount[a.name] || 0;
        const gamesB = memberGameCount[b.name] || 0;
        return gamesA - gamesB;
    });

    // 2단계: 후보 풀 확장 (게임수 적은 4-12명을 후보로)
    const candidatePoolSize = Math.min(12, sortedByGames.length);
    const candidatePool = sortedByGames.slice(0, candidatePoolSize);
    console.log(`🎯 후보 풀: ${candidatePool.length}명`, candidatePool.map(m => `${m.name}(게임${memberGameCount[m.name] || 0})`));

    // 3단계: 후보 풀에서 가능한 모든 4명 조합 생성 후 랜덤 섞기 (최대 50개)
    const allCombinations = generatePlayerCombinations(candidatePool, 4, memberGameCount);

    // Fisher-Yates 셔플로 조합 순서 랜덤화
    for (let i = allCombinations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCombinations[i], allCombinations[j]] = [allCombinations[j], allCombinations[i]];
    }

    const playerCombinations = allCombinations.slice(0, 50);
    console.log(`🔄 총 ${playerCombinations.length}개의 4명 조합 생성 (랜덤 섞기 적용)`);

    // 4단계: 각 4명 조합에 대해 가능한 팀 구성 생성 및 평가
    let allCandidates = [];

    for (const players of playerCombinations) {
        // 이 4명으로 가능한 모든 팀 구성 방식 (3가지)
        const teamCombinations = [
            { team1: [players[0], players[1]], team2: [players[2], players[3]] },
            { team1: [players[0], players[2]], team2: [players[1], players[3]] },
            { team1: [players[0], players[3]], team2: [players[1], players[2]] }
        ];

        for (const combo of teamCombinations) {
            // 유효성 및 중복 체크
            if (validateTeamCombination(combo.team1, combo.team2) && isNewCombination(combo.team1, combo.team2)) {
                allCandidates.push(combo);
            }
        }
    }

    console.log(`✅ 유효한 후보 ${allCandidates.length}개 발견`);

    if (allCandidates.length === 0) {
        console.log('❌ 유효한 조합 없음');
        return null;
    }

    // 5단계: 점수 기반으로 최적 후보 선택
    const bestMatchup = selectBestMatchup(allCandidates, memberGameCount, skillBalance, genderSeparate);

    return bestMatchup;
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
// 전역 변수로 실제 생성된 게임 타입 추적
let actualGameTypeCounts = {
    남복: 0,
    여복: 0,
    혼복: 0
};

function selectTeamsWithRatioDistribution(availableMembers, memberGameCount, skillBalance, gameTypeDistribution, currentGameIndex) {
    console.log(`🎯 비율 기반 팀 선택 (게임 ${currentGameIndex + 1}):`, gameTypeDistribution);
    console.log(`📊 현재까지 생성된 게임:`, actualGameTypeCounts);

    const males = availableMembers.filter(m => m.gender === '남');
    const females = availableMembers.filter(m => m.gender === '여');

    // 현재 필요한 게임 타입 결정 (실제 생성된 개수 기반)
    const targetGameType = determineNextGameType(gameTypeDistribution, actualGameTypeCounts);
    console.log(`🎯 목표 게임 타입: ${targetGameType}`);
    
    // 목표 타입에 따라 팀 생성 (카운터 증가는 메인 루프에서 처리)
    switch (targetGameType) {
        case '남복':
            if (males.length >= 4) {
                const selectedMales = selectDiversePlayers(males, 4, currentGameIndex, '남성');
                const teams = createBalancedTeams(selectedMales, skillBalance);
                if (teams && validateTeamCombination(teams.team1, teams.team2)) {
                    console.log('🔵 비율 기반 남복 생성 시도 성공');
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
                    console.log('🔴 비율 기반 여복 생성 시도 성공');
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

                    console.log('🟡 비율 기반 혼복 생성 시도 성공');
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

// 다음 게임 타입 결정 (실제 생성된 개수 기반)
function determineNextGameType(targetDistribution, actualCounts) {
    // 남은 게임 수 계산
    const remaining = {
        남복: targetDistribution.남복 - actualCounts.남복,
        여복: targetDistribution.여복 - actualCounts.여복,
        혼복: targetDistribution.혼복 - actualCounts.혼복
    };

    console.log('📊 남은 게임:', remaining);

    // 남은 게임이 없는 타입 제외
    const candidates = [];
    if (remaining.남복 > 0) candidates.push('남복');
    if (remaining.여복 > 0) candidates.push('여복');
    if (remaining.혼복 > 0) candidates.push('혼복');

    if (candidates.length === 0) {
        console.log('⚠️ 모든 타입이 목표에 도달했습니다');
        return '혼복'; // 기본값
    }

    // 가장 부족한 타입을 우선 선택 (비율 기준)
    let maxDeficit = -1;
    let selectedType = candidates[0];

    for (const type of candidates) {
        const target = targetDistribution[type];
        const actual = actualCounts[type];
        const deficit = target > 0 ? (target - actual) / target : 0;

        if (deficit > maxDeficit) {
            maxDeficit = deficit;
            selectedType = type;
        }
    }

    return selectedType;
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
        
        // 재생성 플래그 설정 (중복 저장 방지)
        window.isRegenerating = true;
        
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

// 대진표 리프레시 함수 (UI 버튼용)
function refreshBracket() {
    regenerateBracket();
}