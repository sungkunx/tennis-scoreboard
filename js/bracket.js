// 대진표 생성 및 관리 기능들 (랜덤 방식)

// 랜덤 대진표 생성
function createRandomBracket(members, courtCount, timeCount, genderSeparate, skillBalance) {
    const games = [];
    const totalGames = courtCount * timeCount;
    
    // 게임별 멤버 배치 추적
    const memberGameCount = {};
    members.forEach(member => {
        memberGameCount[member.name] = 0;
    });
    
    for (let time = 1; time <= timeCount; time++) {
        for (let court = 1; court <= courtCount; court++) {
            const gameId = `T${time}-C${court}`;
            
            // 가용한 멤버들 찾기 (현재 타임에 이미 배정되지 않은 멤버)
            const currentTimeMembers = games
                .filter(g => g.time === time)
                .flatMap(g => [...(g.team1 || []), ...(g.team2 || [])]);
            
            const availableMembers = members.filter(member => 
                !currentTimeMembers.find(tm => tm.name === member.name)
            );
            
            if (availableMembers.length >= 4) {
                const teams = selectTeams(availableMembers, genderSeparate, skillBalance);
                
                if (teams) {
                    games.push({
                        id: gameId,
                        time: time,
                        court: court,
                        team1: teams.team1,
                        team2: teams.team2,
                        teamType: getTeamType(teams.team1[0], teams.team1[1]),
                        score1: null,
                        score2: null,
                        completed: false
                    });
                    
                    // 멤버 게임 수 증가
                    [...teams.team1, ...teams.team2].forEach(member => {
                        memberGameCount[member.name]++;
                    });
                }
            }
        }
    }
    
    return {
        games,
        memberGameCount,
        settings: { genderSeparate, skillBalance, courtCount, timeCount }
    };
}

// 팀 선택 로직
function selectTeams(availableMembers, genderSeparate, skillBalance) {
    if (availableMembers.length < 4) return null;
    
    const shuffled = shuffleArray(availableMembers);
    
    if (genderSeparate) {
        return selectTeamsByGender(shuffled, skillBalance);
    } else {
        return selectTeamsRandom(shuffled, skillBalance);
    }
}

// 성별 구분 팀 선택
function selectTeamsByGender(members, skillBalance) {
    const males = members.filter(m => m.gender === '남');
    const females = members.filter(m => m.gender === '여');
    const any = members.filter(m => m.gender === '상관없음');
    
    // 남복 우선 시도
    if (males.length >= 4) {
        const team1 = males.slice(0, 2);
        const team2 = males.slice(2, 4);
        if (skillBalance) {
            return balanceTeamSkills(team1, team2, males);
        }
        return { team1, team2 };
    }
    
    // 여복 시도
    if (females.length >= 4) {
        const team1 = females.slice(0, 2);
        const team2 = females.slice(2, 4);
        if (skillBalance) {
            return balanceTeamSkills(team1, team2, females);
        }
        return { team1, team2 };
    }
    
    // 혼복으로 폴백
    return selectTeamsRandom(members, skillBalance);
}

// 랜덤 팀 선택
function selectTeamsRandom(members, skillBalance) {
    if (members.length < 4) return null;
    
    const team1 = members.slice(0, 2);
    const team2 = members.slice(2, 4);
    
    if (skillBalance) {
        return balanceTeamSkills(team1, team2, members);
    }
    
    return { team1, team2 };
}

// 팀 실력 균형 조정
function balanceTeamSkills(team1, team2, allMembers) {
    if (allMembers.length < 4) return { team1, team2 };
    
    let bestCombination = { team1, team2 };
    let minDifference = Math.abs(calculateTeamSkill(team1[0], team1[1]) - calculateTeamSkill(team2[0], team2[1]));
    
    // 가능한 모든 조합 시도 (4명에서 2명씩 선택)
    for (let i = 0; i < allMembers.length - 1; i++) {
        for (let j = i + 1; j < allMembers.length; j++) {
            for (let k = 0; k < allMembers.length - 1; k++) {
                for (let l = k + 1; l < allMembers.length; l++) {
                    if (k === i || k === j || l === i || l === j) continue;
                    
                    const newTeam1 = [allMembers[i], allMembers[j]];
                    const newTeam2 = [allMembers[k], allMembers[l]];
                    
                    const skill1 = calculateTeamSkill(newTeam1[0], newTeam1[1]);
                    const skill2 = calculateTeamSkill(newTeam2[0], newTeam2[1]);
                    const difference = Math.abs(skill1 - skill2);
                    
                    if (difference < minDifference) {
                        minDifference = difference;
                        bestCombination = { team1: newTeam1, team2: newTeam2 };
                    }
                }
            }
        }
    }
    
    return bestCombination;
}

// 대진표 재생성
function regenerateBracket() {
    if (confirm('현재 대진표를 다시 생성하시겠습니까?')) {
        generateBracket();
    }
}