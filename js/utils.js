// 공통 유틸리티 함수들

// 날짜 포맷팅
function formatDate(date) {
    return date.toLocaleDateString('ko-KR');
}

// 팀 타입 결정 (남복/여복/혼복)
function getTeamType(member1, member2) {
    if (member1.gender === '남' && member2.gender === '남') {
        return '남복';
    } else if (member1.gender === '여' && member2.gender === '여') {
        return '여복';
    } else {
        return '혼복';
    }
}

// 실력 점수 계산
function calculateTeamSkill(member1, member2) {
    return member1.skill + member2.skill;
}

// 배열 섞기 (Fisher-Yates 셔플)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 멤버 게임 수 균등 체크
function checkGameBalance(games, members) {
    const memberGameCount = {};
    
    // 각 멤버의 게임 수 계산
    members.forEach(member => {
        memberGameCount[member.name] = 0;
    });
    
    games.forEach(game => {
        if (game.team1 && game.team1.length === 2) {
            game.team1.forEach(member => {
                memberGameCount[member.name]++;
            });
        }
        if (game.team2 && game.team2.length === 2) {
            game.team2.forEach(member => {
                memberGameCount[member.name]++;
            });
        }
    });
    
    const gameCounts = Object.values(memberGameCount);
    const maxGames = Math.max(...gameCounts);
    const minGames = Math.min(...gameCounts);
    
    return {
        balanced: maxGames - minGames <= 1,
        maxGames,
        minGames,
        memberGameCount
    };
}

// 디버그 로그 (개발용)
function debugLog(message, data = null) {
    if (console && console.log) {
        if (data) {
            console.log(`[Tennis Scoreboard] ${message}:`, data);
        } else {
            console.log(`[Tennis Scoreboard] ${message}`);
        }
    }
}