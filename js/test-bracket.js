// 대진표 알고리즘 테스트 모듈
// 프론트엔드에서는 보이지 않고, 콘솔에서만 실행 가능

// 테스트 설정
const TEST_CONFIG = {
    defaultMembers: [
        { name: 'A', gender: '남', skill: 5 },
        { name: 'B', gender: '남', skill: 6 },
        { name: 'C', gender: '남', skill: 4 },
        { name: 'D', gender: '남', skill: 7 },
        { name: 'E', gender: '여', skill: 5 },
        { name: 'F', gender: '여', skill: 6 },
        { name: 'G', gender: '여', skill: 4 },
        { name: 'H', gender: '여', skill: 7 }
    ],
    defaultCourts: 2,
    defaultTimes: 4,
    iterations: 10 // 테스트 반복 횟수
};

// 메인 테스트 실행 함수
function runBracketTest(options = {}) {
    console.log('🧪 ========================================');
    console.log('🧪 대진표 알고리즘 테스트 시작');
    console.log('🧪 ========================================\n');

    const config = {
        members: options.members || TEST_CONFIG.defaultMembers,
        courts: options.courts || TEST_CONFIG.defaultCourts,
        times: options.times || TEST_CONFIG.defaultTimes,
        iterations: options.iterations || TEST_CONFIG.iterations,
        genderSeparate: options.genderSeparate !== undefined ? options.genderSeparate : true,
        skillBalance: options.skillBalance !== undefined ? options.skillBalance : true
    };

    console.log('📋 테스트 설정:', {
        멤버수: config.members.length,
        코트수: config.courts,
        타임수: config.times,
        총게임수: config.courts * config.times,
        반복횟수: config.iterations,
        성별구분: config.genderSeparate,
        실력균형: config.skillBalance
    });
    console.log('\n');

    // 테스트 실행
    const results = {
        firstGameRandomness: testFirstGameRandomness(config),
        teammateRepetition: testTeammateRepetition(config),
        matchupDiversity: testMatchupDiversity(config),
        gameBalance: testGameBalance(config)
    };

    // 최종 리포트 생성
    generateTestReport(results, config);

    return results;
}

// 1. 첫 게임 랜덤성 테스트
function testFirstGameRandomness(config) {
    console.log('🎲 [테스트 1/4] 첫 게임 랜덤성 검증');
    console.log('─────────────────────────────────────');

    const firstGames = [];
    const firstGameCombinations = new Set();

    for (let i = 0; i < config.iterations; i++) {
        const bracket = createRandomBracket(
            config.members,
            config.courts,
            config.times,
            config.genderSeparate,
            config.skillBalance
        );

        if (bracket.games.length > 0) {
            const firstGame = bracket.games[0];
            const combo = `${firstGame.team1[0].name},${firstGame.team1[1].name} vs ${firstGame.team2[0].name},${firstGame.team2[1].name}`;
            firstGames.push(combo);
            firstGameCombinations.add(combo);
        }
    }

    const uniqueCount = firstGameCombinations.size;
    const randomnessRate = (uniqueCount / config.iterations * 100).toFixed(1);

    console.log(`✅ ${config.iterations}번 생성 중 ${uniqueCount}개의 서로 다른 첫 게임 조합`);
    console.log(`📊 랜덤성: ${randomnessRate}%`);

    if (uniqueCount === 1) {
        console.log('❌ 경고: 모든 테스트에서 동일한 첫 게임! 랜덤성 문제 있음');
    } else if (uniqueCount < config.iterations * 0.5) {
        console.log('⚠️  주의: 랜덤성이 낮습니다 (50% 미만)');
    } else {
        console.log('✅ 랜덤성 양호');
    }

    console.log('\n첫 게임 분포:');
    const distribution = {};
    firstGames.forEach(combo => {
        distribution[combo] = (distribution[combo] || 0) + 1;
    });
    Object.entries(distribution)
        .sort((a, b) => b[1] - a[1])
        .forEach(([combo, count]) => {
            console.log(`  ${combo}: ${count}번`);
        });

    console.log('\n');

    return {
        uniqueCount,
        totalTests: config.iterations,
        randomnessRate: parseFloat(randomnessRate),
        distribution,
        passed: uniqueCount > config.iterations * 0.5
    };
}

// 2. 팀메이트 반복 검증
function testTeammateRepetition(config) {
    console.log('🤝 [테스트 2/4] 팀메이트 반복 검증');
    console.log('─────────────────────────────────────');

    const allTeammateViolations = [];
    let totalBrackets = 0;
    let violationCount = 0;

    for (let i = 0; i < config.iterations; i++) {
        const bracket = createRandomBracket(
            config.members,
            config.courts,
            config.times,
            config.genderSeparate,
            config.skillBalance
        );

        totalBrackets++;

        // 팀메이트 빈도 분석
        const teammateFrequency = {};
        bracket.games.forEach(game => {
            // team1
            if (game.team1 && game.team1.length === 2) {
                const key = [game.team1[0].name, game.team1[1].name].sort().join(',');
                teammateFrequency[key] = (teammateFrequency[key] || 0) + 1;
            }
            // team2
            if (game.team2 && game.team2.length === 2) {
                const key = [game.team2[0].name, game.team2[1].name].sort().join(',');
                teammateFrequency[key] = (teammateFrequency[key] || 0) + 1;
            }
        });

        // 위반 사항 체크 (2회 이상 반복)
        const violations = Object.entries(teammateFrequency)
            .filter(([pair, count]) => count > 1)
            .map(([pair, count]) => ({ pair, count }));

        if (violations.length > 0) {
            violationCount++;
            allTeammateViolations.push({
                bracketIndex: i + 1,
                violations
            });
        }
    }

    const passRate = ((totalBrackets - violationCount) / totalBrackets * 100).toFixed(1);

    console.log(`✅ ${totalBrackets}개 대진표 중 ${totalBrackets - violationCount}개 통과`);
    console.log(`📊 통과율: ${passRate}%`);

    if (violationCount === 0) {
        console.log('✅ 모든 대진표에서 팀메이트 반복 없음!');
    } else {
        console.log(`❌ ${violationCount}개 대진표에서 팀메이트 반복 발견:`);
        allTeammateViolations.slice(0, 3).forEach(({ bracketIndex, violations }) => {
            console.log(`  대진표 #${bracketIndex}:`);
            violations.forEach(({ pair, count }) => {
                console.log(`    - ${pair}: ${count}번 팀 구성`);
            });
        });
        if (allTeammateViolations.length > 3) {
            console.log(`  ... 외 ${allTeammateViolations.length - 3}건`);
        }
    }

    console.log('\n');

    return {
        totalBrackets,
        violationCount,
        passRate: parseFloat(passRate),
        violations: allTeammateViolations,
        passed: violationCount === 0
    };
}

// 3. 대전 상대 다양성 검증
function testMatchupDiversity(config) {
    console.log('⚔️  [테스트 3/4] 대전 상대 다양성 검증');
    console.log('─────────────────────────────────────');

    const allMatchupStats = [];

    for (let i = 0; i < config.iterations; i++) {
        const bracket = createRandomBracket(
            config.members,
            config.courts,
            config.times,
            config.genderSeparate,
            config.skillBalance
        );

        // 대전 상대 빈도 분석
        const matchupFrequency = {};
        bracket.games.forEach(game => {
            if (game.team1 && game.team2) {
                // team1의 각 선수 vs team2의 각 선수
                game.team1.forEach(p1 => {
                    game.team2.forEach(p2 => {
                        const key = [p1.name, p2.name].sort().join(' vs ');
                        matchupFrequency[key] = (matchupFrequency[key] || 0) + 1;
                    });
                });
            }
        });

        const frequencies = Object.values(matchupFrequency);
        const maxFreq = Math.max(...frequencies);
        const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const stdDev = Math.sqrt(
            frequencies.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) / frequencies.length
        );

        allMatchupStats.push({
            maxFreq,
            avgFreq,
            stdDev,
            totalMatchups: Object.keys(matchupFrequency).length
        });
    }

    const avgMaxFreq = allMatchupStats.reduce((sum, s) => sum + s.maxFreq, 0) / allMatchupStats.length;
    const avgAvgFreq = allMatchupStats.reduce((sum, s) => sum + s.avgFreq, 0) / allMatchupStats.length;
    const avgStdDev = allMatchupStats.reduce((sum, s) => sum + s.stdDev, 0) / allMatchupStats.length;

    console.log(`📊 대전 상대 통계 (평균):`);
    console.log(`  - 최대 반복 횟수: ${avgMaxFreq.toFixed(2)}회`);
    console.log(`  - 평균 대전 횟수: ${avgAvgFreq.toFixed(2)}회`);
    console.log(`  - 표준편차: ${avgStdDev.toFixed(2)}`);

    const diversityScore = 100 - (avgStdDev / avgAvgFreq * 100);

    if (avgMaxFreq <= 2) {
        console.log('✅ 대전 상대 다양성 우수 (최대 2회 이하)');
    } else if (avgMaxFreq <= 3) {
        console.log('⚠️  대전 상대 다양성 보통 (최대 3회 이하)');
    } else {
        console.log('❌ 대전 상대 다양성 부족 (최대 4회 이상)');
    }

    console.log('\n');

    return {
        avgMaxFreq,
        avgAvgFreq,
        avgStdDev,
        diversityScore: Math.max(0, diversityScore),
        passed: avgMaxFreq <= 2
    };
}

// 4. 게임수 균형 검증
function testGameBalance(config) {
    console.log('⚖️  [테스트 4/4] 게임수 균형 검증');
    console.log('─────────────────────────────────────');

    const allBalanceStats = [];

    for (let i = 0; i < config.iterations; i++) {
        const bracket = createRandomBracket(
            config.members,
            config.courts,
            config.times,
            config.genderSeparate,
            config.skillBalance
        );

        const gameCounts = Object.values(bracket.memberGameCount);
        const maxGames = Math.max(...gameCounts);
        const minGames = Math.min(...gameCounts);
        const avgGames = gameCounts.reduce((a, b) => a + b, 0) / gameCounts.length;
        const imbalance = maxGames - minGames;

        allBalanceStats.push({
            maxGames,
            minGames,
            avgGames,
            imbalance
        });
    }

    const avgImbalance = allBalanceStats.reduce((sum, s) => sum + s.imbalance, 0) / allBalanceStats.length;
    const maxImbalance = Math.max(...allBalanceStats.map(s => s.imbalance));
    const avgMaxGames = allBalanceStats.reduce((sum, s) => sum + s.maxGames, 0) / allBalanceStats.length;
    const avgMinGames = allBalanceStats.reduce((sum, s) => sum + s.minGames, 0) / allBalanceStats.length;

    console.log(`📊 게임수 균형 통계:`);
    console.log(`  - 평균 최대 게임수: ${avgMaxGames.toFixed(2)}`);
    console.log(`  - 평균 최소 게임수: ${avgMinGames.toFixed(2)}`);
    console.log(`  - 평균 불균형: ${avgImbalance.toFixed(2)}`);
    console.log(`  - 최대 불균형: ${maxImbalance}`);

    if (avgImbalance <= 1) {
        console.log('✅ 게임수 균형 우수 (평균 차이 1 이하)');
    } else if (avgImbalance <= 2) {
        console.log('⚠️  게임수 균형 보통 (평균 차이 2 이하)');
    } else {
        console.log('❌ 게임수 균형 부족 (평균 차이 3 이상)');
    }

    console.log('\n');

    return {
        avgImbalance,
        maxImbalance,
        avgMaxGames,
        avgMinGames,
        passed: avgImbalance <= 1
    };
}

// 최종 리포트 생성
function generateTestReport(results, config) {
    console.log('📊 ========================================');
    console.log('📊 최종 테스트 리포트');
    console.log('📊 ========================================\n');

    const tests = [
        { name: '첫 게임 랜덤성', result: results.firstGameRandomness, emoji: '🎲' },
        { name: '팀메이트 반복 방지', result: results.teammateRepetition, emoji: '🤝' },
        { name: '대전 상대 다양성', result: results.matchupDiversity, emoji: '⚔️' },
        { name: '게임수 균형', result: results.gameBalance, emoji: '⚖️' }
    ];

    let passedCount = 0;
    tests.forEach(({ name, result, emoji }) => {
        const status = result.passed ? '✅ 통과' : '❌ 실패';
        console.log(`${emoji} ${name}: ${status}`);
        if (result.passed) passedCount++;
    });

    const totalScore = (passedCount / tests.length * 100).toFixed(0);
    console.log('\n');
    console.log('📈 종합 점수:', `${totalScore}/100`);

    if (totalScore == 100) {
        console.log('🎉 모든 테스트 통과! 알고리즘이 정상 작동합니다.');
    } else if (totalScore >= 75) {
        console.log('✅ 대부분의 테스트 통과. 일부 개선이 필요할 수 있습니다.');
    } else if (totalScore >= 50) {
        console.log('⚠️  절반의 테스트만 통과. 알고리즘 개선이 필요합니다.');
    } else {
        console.log('❌ 대부분의 테스트 실패. 알고리즘에 심각한 문제가 있습니다.');
    }

    console.log('\n');
    console.log('💡 사용 팁:');
    console.log('  - 더 많은 반복으로 테스트: runBracketTest({ iterations: 50 })');
    console.log('  - 다른 설정으로 테스트: runBracketTest({ courts: 3, times: 5 })');
    console.log('  - 성별 구분 없이: runBracketTest({ genderSeparate: false })');
    console.log('\n');

    return {
        totalScore: parseInt(totalScore),
        passedCount,
        totalTests: tests.length,
        details: results
    };
}

// 간단한 테스트 실행
function quickTest() {
    console.log('⚡ 빠른 테스트 실행 (3회 반복)...\n');
    return runBracketTest({ iterations: 3 });
}

// 심화 테스트 실행
function deepTest() {
    console.log('🔬 심화 테스트 실행 (30회 반복)...\n');
    return runBracketTest({ iterations: 30 });
}

// 콘솔 사용 안내
console.log('🧪 대진표 테스트 모듈 로드됨');
console.log('💡 사용법:');
console.log('  - quickTest()      : 빠른 테스트 (3회)');
console.log('  - runBracketTest() : 기본 테스트 (10회)');
console.log('  - deepTest()       : 심화 테스트 (30회)');
console.log('');
