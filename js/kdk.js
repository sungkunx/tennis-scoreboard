// KDK 방식 관련 기능들

// KDK 매치 조합 테이블
const KDK_MATCH_COMBINATIONS = {
    5: ['14:23', '12:35', '15:24', '13:45', '25:34'],
    6: ['13:25', '26:45', '16:35', '23:46', '15:24', '14:36'],
    7: ['17:26', '25:36', '14:56', '27:45', '15:37', '34:67', '13:24'],
    8: ['18:27', '36:45', '16:25', '38:47', '17:46', '28:35', '26:37', '15:48'],
    9: ['18:27', '36:45', '16:79', '25:34', '58:69', '14:23', '57:68', '19:38', '29:47'],
    10: ['1A:29', '37:48', '19:56', '2A:38', '39:57', '28:46', '16:3A', '17:45', '26:58', '79:4A']
};

// KDK 번호 배정 (실력 기반 또는 완전 랜덤)
function assignKDKNumbers(members, useSkillBalance = true) {
    console.log('🎯 KDK 번호 배정 시작:', members, '실력 구분:', useSkillBalance);
    
    let sortedMembers;
    
    if (useSkillBalance) {
        // 실력별 그룹화
        const skillGroups = {};
        members.forEach(member => {
            if (!skillGroups[member.skill]) {
                skillGroups[member.skill] = [];
            }
            skillGroups[member.skill].push(member);
        });
        
        console.log('📊 실력별 그룹:', skillGroups);
        
        // 높은 실력부터 정렬 (9 → 1)
        const sortedSkills = Object.keys(skillGroups).sort((a, b) => parseInt(b) - parseInt(a));
        
        sortedMembers = [];
        sortedSkills.forEach(skill => {
            // 각 실력 그룹 내에서 랜덤 셔플
            const shuffled = shuffleArray(skillGroups[skill]);
            sortedMembers.push(...shuffled);
        });
        
        console.log('🎲 실력별 정렬 후 그룹 내 랜덤:', sortedMembers);
    } else {
        // 완전 랜덤
        sortedMembers = shuffleArray([...members]);
        console.log('🎲 완전 랜덤 정렬:', sortedMembers);
    }
    
    // KDK 번호 배정
    const result = sortedMembers.map((member, index) => {
        const kdkNumber = index + 1;
        const kdkNumberStr = kdkNumber <= 9 ? kdkNumber.toString() : 'A';
        
        const kdkMember = {
            ...member,
            kdkNumber: kdkNumberStr,
            originalIndex: members.indexOf(member)
        };
        
        console.log(`🏷️ ${member.name} → KDK(${kdkNumberStr}) 실력${member.skill}`);
        return kdkMember;
    });
    
    // KDK 번호 순으로 정렬
    result.sort((a, b) => {
        if (a.kdkNumber === 'A') return 1;
        if (b.kdkNumber === 'A') return -1;
        return parseInt(a.kdkNumber) - parseInt(b.kdkNumber);
    });
    
    console.log('✅ KDK 번호 배정 완료:', result);
    return result;
}

// KDK 대진표 생성
function createKDKBracket(members, courtCount, useSkillBalance = true) {
    console.log('🎾 KDK 대진표 생성 시작');
    
    const memberCount = members.length;
    
    // KDK 번호 배정
    const kdkMembers = assignKDKNumbers(members, useSkillBalance);
    
    // 매치 조합 가져오기
    const combinations = KDK_MATCH_COMBINATIONS[memberCount];
    if (!combinations) {
        throw new Error(`${memberCount}명에 대한 KDK 조합이 정의되지 않았습니다.`);
    }
    
    console.log('🔄 매치 조합:', combinations);
    
    // 게임 생성
    const games = [];
    let currentTime = 1;
    let currentCourt = 1;
    
    combinations.forEach((combination, gameIndex) => {
        const game = createKDKGame(combination, kdkMembers, currentTime, currentCourt, gameIndex);
        if (game) {
            games.push(game);
            
            // 다음 코트로 이동
            currentCourt++;
            if (currentCourt > courtCount) {
                currentCourt = 1;
                currentTime++;
            }
        }
    });
    
    // 멤버별 게임 수 계산
    const memberGameCount = {};
    kdkMembers.forEach(member => {
        memberGameCount[member.name] = 0;
    });
    
    games.forEach(game => {
        [...game.team1, ...game.team2].forEach(member => {
            memberGameCount[member.name]++;
        });
    });
    
    console.log('📊 멤버별 게임 수:', memberGameCount);
    console.log('✅ KDK 대진표 생성 완료:', games);
    
    return {
        games,
        memberGameCount,
        kdkMembers,
        settings: { 
            bracketType: 'kdk',
            courtCount,
            timeCount: Math.ceil(combinations.length / courtCount)
        }
    };
}

// KDK 게임 생성
function createKDKGame(combination, kdkMembers, time, court, gameIndex) {
    console.log(`🎮 게임 ${gameIndex + 1} 생성: ${combination}`);
    
    // 조합 파싱 (예: "13:25" → team1: [1,3], team2: [2,5])
    // "3A:16" → team1: [3,A], team2: [1,6]
    const [team1Str, team2Str] = combination.split(':');
    
    // 문자열을 숫자와 A로 분리하는 함수
    function parseTeamString(str) {
        const result = [];
        for (let i = 0; i < str.length; i++) {
            if (str[i] === 'A') {
                result.push('A');
            } else {
                result.push(str[i]);
            }
        }
        return result;
    }
    
    const team1Numbers = parseTeamString(team1Str);
    const team2Numbers = parseTeamString(team2Str);
    
    console.log(`👥 팀1: ${team1Numbers.join(',')}, 팀2: ${team2Numbers.join(',')}`);
    
    // KDK 번호로 멤버 찾기
    const team1 = team1Numbers.map(num => 
        kdkMembers.find(member => member.kdkNumber === num)
    ).filter(Boolean);
    
    const team2 = team2Numbers.map(num => 
        kdkMembers.find(member => member.kdkNumber === num)
    ).filter(Boolean);
    
    if (team1.length !== 2 || team2.length !== 2) {
        console.error(`❌ 팀 구성 실패: ${combination}`);
        return null;
    }
    
    const gameId = `T${time}-C${court}`;
    
    const game = {
        id: gameId,
        time: time,
        court: court,
        team1: team1,
        team2: team2,
        teamType: getKDKTeamType(team1, team2),
        score1: null,
        score2: null,
        completed: false,
        kdkGame: true, // KDK 게임 표시
        kdkCombination: combination
    };
    
    console.log(`✅ 게임 생성 완료: ${gameId} - ${team1.map(m => m.kdkNumber).join('')}:${team2.map(m => m.kdkNumber).join('')}`);
    
    return game;
}

// KDK 팀 타입 결정 (KDK에서는 실력 기반)
function getKDKTeamType(team1, team2) {
    // KDK에서는 번호가 낮을수록 실력이 높음
    const team1Avg = team1.reduce((sum, member) => {
        const num = member.kdkNumber === 'A' ? 10 : parseInt(member.kdkNumber);
        return sum + num;
    }, 0) / team1.length;
    
    const team2Avg = team2.reduce((sum, member) => {
        const num = member.kdkNumber === 'A' ? 10 : parseInt(member.kdkNumber);
        return sum + num;
    }, 0) / team2.length;
    
    const diff = Math.abs(team1Avg - team2Avg);
    
    if (diff <= 1) {
        return 'KDK 균형';
    } else if (diff <= 2) {
        return 'KDK 보통';
    } else {
        return 'KDK 차이';
    }
}