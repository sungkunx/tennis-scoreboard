export function generateSchedule(players, numCourts, numRounds, gameConfig) {
    shuffleArray(players);
    const { targetMixed, targetMens, targetWomens } = gameConfig;
    let playerStats = {};
    players.forEach(p => {
        playerStats[p.id] = {
            gamesPlayed: 0,
            consecutiveRests: 0,
            partners: new Set(),
            opponents: new Set()
        };
    });
    const finalSchedule = [];
    let lastRoundQuartets = new Set(); // For tracking player quartets to prevent repetition
    let lastRoundMixedMaleInfo = { opponents: new Set(), players: new Set() }; // For tracking male players in mixed doubles
    let remainingMixed = targetMixed;
    let remainingMens = targetMens;
    let remainingWomens = targetWomens;
    for (let r = 0; r < numRounds; r++) {
        const roundSchedule = { round: r + 1, matches: [], restingPlayers: [] };
        const playersInRound = new Set();
        const gameTypesInRound = [];
        const currentRoundQuartets = new Set(); // To store quartets for this round
        const currentRoundMixedMaleInfo = { opponents: new Set(), players: new Set() }; // To store mixed doubles male players for this round

        for (let c = 0; c < numCourts; c++) {
            const availablePlayers = players.filter(p => !playersInRound.has(p.id));
            let possibleMatches = [];
            const bestMensMatch = findBestMatchOfType('남자 복식', availablePlayers, playerStats, lastRoundQuartets, lastRoundMixedMaleInfo);
            if (bestMensMatch) possibleMatches.push({ type: '남자 복식', ...bestMensMatch, target: remainingMens });
            const bestWomensMatch = findBestMatchOfType('여자 복식', availablePlayers, playerStats, lastRoundQuartets, lastRoundMixedMaleInfo);
            if (bestWomensMatch) possibleMatches.push({ type: '여자 복식', ...bestWomensMatch, target: remainingWomens });
            const bestMixedMatch = findBestMatchOfType('혼합 복식', availablePlayers, playerStats, lastRoundQuartets, lastRoundMixedMaleInfo);
            if (bestMixedMatch) possibleMatches.push({ type: '혼합 복식', ...bestMixedMatch, target: remainingMixed });
            if (possibleMatches.length === 0) break;
            possibleMatches.sort((a, b) => {
                if (a.target > 0 && b.target <= 0) return -1;
                if (a.target <= 0 && b.target > 0) return 1;
                const aPenalty = gameTypesInRound.includes(a.type) ? 5 : 0;
                const bPenalty = gameTypesInRound.includes(b.type) ? 5 : 0;
                return (a.cost + aPenalty) - (b.cost + bPenalty);
            });
            const bestChoice = possibleMatches[0];
            roundSchedule.matches.push({ court: c + 1, type: bestChoice.type, ...bestChoice.match });
            const matchPlayers = [...bestChoice.match.team1, ...bestChoice.match.team2];
            
            const quartetKey = matchPlayers.map(p => p.id).sort().join('-');
            currentRoundQuartets.add(quartetKey);

            // If mixed doubles, record the male players for the next round's penalty calculation
            if (bestChoice.type === '혼합 복식') {
                const malePlayers = matchPlayers.filter(p => p.gender === 'male');
                if (malePlayers.length === 2) {
                    malePlayers.forEach(p => currentRoundMixedMaleInfo.players.add(p.id));
                    const maleOpponentKey = malePlayers.map(p => p.id).sort().join('-');
                    currentRoundMixedMaleInfo.opponents.add(maleOpponentKey);
                }
            }

            matchPlayers.forEach(p => playersInRound.add(p.id));
            gameTypesInRound.push(bestChoice.type);
            if (bestChoice.type === '남자 복식') remainingMens--;
            if (bestChoice.type === '여자 복식') remainingWomens--;
            if (bestChoice.type === '혼합 복식') remainingMixed--;
        }
        players.forEach(p => {
            if (playersInRound.has(p.id)) {
                playerStats[p.id].gamesPlayed++;
                playerStats[p.id].consecutiveRests = 0;
                roundSchedule.matches.forEach(match => {
                    const matchPlayerIds = [...match.team1, ...match.team2].map(pl => pl.id);
                    if (matchPlayerIds.includes(p.id)) {
                        let myTeam, opponentTeam;
                        if (match.team1.some(pl => pl.id === p.id)) {
                            myTeam = match.team1;
                            opponentTeam = match.team2;
                        } else {
                            myTeam = match.team2;
                            opponentTeam = match.team1;
                        }
                        myTeam.filter(pl => pl.id !== p.id).forEach(partner => playerStats[p.id].partners.add(partner.id));
                        opponentTeam.forEach(opponent => playerStats[p.id].opponents.add(opponent.id));
                    }
                });
            } else {
                playerStats[p.id].consecutiveRests++;
                roundSchedule.restingPlayers.push(p);
            }
        });
        finalSchedule.push(roundSchedule);
        lastRoundQuartets = currentRoundQuartets;
        lastRoundMixedMaleInfo = currentRoundMixedMaleInfo;
    }
    return finalSchedule;
}

function calculatePairPenalty(playerA, playerB, playerStats) {
    const statsA = playerStats[playerA.id];
    const statsB = playerStats[playerB.id];
    const seenPenalty = statsA.partners.has(playerB.id) ? 8 : 0;
    const skillGapPenalty = Math.abs(playerA.skill - playerB.skill);

    // Clamp rest bonus to max 1 per player to prevent excessive grouping
    const restReward = Math.min(statsA.consecutiveRests, 1) + Math.min(statsB.consecutiveRests, 1);
    
    const gamesPlayedPenalty = statsA.gamesPlayed + statsB.gamesPlayed;

    // Add penalty for pairing two players who both just rested
    let restRestPenalty = 0;
    if (statsA.consecutiveRests > 0 && statsB.consecutiveRests > 0) {
        restRestPenalty = 2.0;
    }

    return seenPenalty + skillGapPenalty - (0.5 * restReward) + gamesPlayedPenalty + restRestPenalty;
}

function findBestMatchOfType(type, availablePlayers, playerStats, lastRoundQuartets, lastRoundMixedMaleInfo) {
    const availableMales = availablePlayers.filter(p => p.gender === 'male');
    const availableFemales = availablePlayers.filter(p => p.gender === 'female');
    const isMixed = type === '혼합 복식';
    let pool1 = availableMales;
    let pool2 = isMixed ? availableFemales : null;
    if (type === '여자 복식') {
        pool1 = availableFemales;
        pool2 = null;
    }
    if ((isMixed && (pool1.length < 2 || pool2.length < 2)) || (!isMixed && pool1.length < 4)) {
        return null;
    }
    const pairs = [];
    if (isMixed) {
        for (const p1 of pool1) {
            for (const p2 of pool2) {
                pairs.push({ players: [p1, p2], penalty: calculatePairPenalty(p1, p2, playerStats) });
            }
        }
    } else {
        for (let j = 0; j < pool1.length; j++) {
            for (let k = j + 1; k < pool1.length; k++) {
                pairs.push({ players: [pool1[j], pool1[k]], penalty: calculatePairPenalty(pool1[j], pool1[k], playerStats) });
            }
        }
    }
    pairs.sort((a, b) => a.penalty - b.penalty);
    const validMatches = [];
    for (let j = 0; j < pairs.length; j++) {
        const pair1 = pairs[j];
        const p1_ids = new Set(pair1.players.map(p => p.id));
        for (let k = j + 1; k < pairs.length; k++) {
            const pair2 = pairs[k];
            if (pair2.players.some(p => p1_ids.has(p.id))) continue;
            const [p1a, p1b] = pair1.players;
            const [p2a, p2b] = pair2.players;
            const skillScore = Math.abs((p1a.skill + p1b.skill) - (p2a.skill + p2b.skill));
            let totalCost = skillScore + pair1.penalty + pair2.penalty;

            // Add penalty for repeating the same 4 players from the last round
            const quartetKey = [p1a.id, p1b.id, p2a.id, p2b.id].sort().join('-');
            if (lastRoundQuartets.has(quartetKey)) {
                totalCost += 2.0;
            }

            // Add penalties for mixed doubles repetition
            if (isMixed) {
                const m1 = pair1.players.find(p => p.gender === 'male');
                const m2 = pair2.players.find(p => p.gender === 'male');
                if (m1 && m2) {
                    // Recent Opponent Penalty
                    const maleOpponentKey = [m1.id, m2.id].sort().join('-');
                    if (lastRoundMixedMaleInfo.opponents.has(maleOpponentKey)) {
                        totalCost += 1.5;
                    }
                    // Consecutive Mixed-Doubles Penalty
                    if (lastRoundMixedMaleInfo.players.has(m1.id)) {
                        totalCost += 0.5;
                    }
                    if (lastRoundMixedMaleInfo.players.has(m2.id)) {
                        totalCost += 0.5;
                    }
                }
            }

            validMatches.push({ match: { team1: pair1.players, team2: pair2.players }, cost: totalCost });
        }
    }
    if (validMatches.length === 0) return null;
    validMatches.sort((a, b) => a.cost - b.cost);
    return validMatches[0];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function getGameConfigurationRecommendations(numMales, numFemales, numCourts, numRounds) {
    const totalGames = numCourts * numRounds;
    const numPlayers = numMales + numFemales;
    let heuristicConfig = null;
    if (numPlayers > 0) {
        const avgGamesPerPlayer = (totalGames * 4) / numPlayers;
        const targetMalePlayerGames = numMales * avgGamesPerPlayer;
        const targetFemalePlayerGames = numFemales * avgGamesPerPlayer;
        const targetMixed = Math.round(totalGames / 3);
        let bestConfigs = [];
        let minError = Infinity;
        for (let mixed = 0; mixed <= totalGames; mixed++) {
            for (let mens = 0; mens <= totalGames - mixed; mens++) {
                const womens = totalGames - mixed - mens;

                // Feasibility Filter: Skip impossible configurations.
                if (mens > 0 && numMales < 4) continue;
                if (womens > 0 && numFemales < 4) continue;
                if (mixed > 0 && (numMales < 2 || numFemales < 2)) continue;

                const actualMalePlayerGames = mixed * 2 + mens * 4;
                const actualFemalePlayerGames = mixed * 2 + womens * 4;
                const genderBalanceError = Math.abs(actualMalePlayerGames - targetMalePlayerGames) + Math.abs(actualFemalePlayerGames - targetFemalePlayerGames);
                const mixedTargetError = Math.abs(mixed - targetMixed);
                const error = genderBalanceError + (mixedTargetError * 4);
                if (error < minError) {
                    minError = error;
                    bestConfigs = [{ mixed, mens, womens }];
                } else if (Math.abs(error - minError) < 0.001) {
                    bestConfigs.push({ mixed, mens, womens });
                }
            }
        }
        if (bestConfigs.length > 0) {
            bestConfigs.sort((a, b) => {
                const aTypes = (a.mixed > 0 ? 1 : 0) + (a.mens > 0 ? 1 : 0) + (a.womens > 0 ? 1 : 0);
                const bTypes = (b.mixed > 0 ? 1 : 0) + (b.mens > 0 ? 1 : 0) + (b.womens > 0 ? 1 : 0);
                return bTypes - aTypes;
            });
            heuristicConfig = { ...bestConfigs[0], gameDifference: 'N/A' };
        }
    }
    const maxMixedPerRound = Math.min(Math.floor(numMales / 2), Math.floor(numFemales / 2), numCourts);
    const maxMensPerRound = Math.min(Math.floor(numMales / 4), numCourts);
    const maxWomensPerRound = Math.min(Math.floor(numFemales / 4), numCourts);
    const strategies = generateAllStrategies(numCourts, maxMixedPerRound, maxMensPerRound, maxWomensPerRound);
    const recommendations = [];
    if(heuristicConfig) {
        recommendations.push({ title: "균형 위주 (추천)", config: heuristicConfig });
    }
    if (strategies.length > 0) {
        const simulatedStrategies = strategies.map(strategy => {
            const stats = simulateGameDistribution(numMales, numFemales, strategy.mixedPerRound, strategy.mensPerRound, strategy.womensPerRound, numRounds);
            return { ...strategy, gameDifference: stats.maxGames - stats.minGames };
        });
        const WEIGHT = 100;
        const findBestForStrategy = (strategyType) => {
            let bestConfig = null;
            let bestScore = Infinity;
            for (const strategy of simulatedStrategies) {
                let currentScore;
                const { mixedPerRound, mensPerRound, womensPerRound, gameDifference } = strategy;
                if (strategyType === 'mwFocus') {
                    currentScore = (numCourts - (mensPerRound + womensPerRound)) * WEIGHT + gameDifference;
                } else if (strategyType === 'varietyFocus') {
                    const numTypesUsed = (mixedPerRound > 0 ? 1 : 0) + (mensPerRound > 0 ? 1 : 0) + (womensPerRound > 0 ? 1 : 0);
                    currentScore = (3 - numTypesUsed) * WEIGHT + gameDifference;
                } else if (strategyType === 'mixedFocus') {
                    currentScore = (numCourts - mixedPerRound) * WEIGHT + gameDifference;
                }
                if (currentScore < bestScore) {
                    bestScore = currentScore;
                    bestConfig = {
                        mixed: mixedPerRound * numRounds,
                        mens: mensPerRound * numRounds,
                        womens: womensPerRound * numRounds,
                        gameDifference: gameDifference
                    };
                }
            }
            return bestConfig;
        };
        recommendations.push({ title: "남복/여복 위주", config: findBestForStrategy('mwFocus') });
        recommendations.push({ title: "혼합 복식 위주", config: findBestForStrategy('mixedFocus') });
    }
    const validRecommendations = recommendations.filter(rec => rec.config);
    const uniqueRecommendations = validRecommendations.reduce((acc, current) => {
        const isDuplicate = acc.some(item => 
            item.config.mixed === current.config.mixed &&
            item.config.mens === current.config.mens &&
            item.config.womens === current.config.womens
        );
        if (!isDuplicate) {
            acc.push(current);
        }
        return acc;
    }, []);
    return uniqueRecommendations;
}

function generateAllStrategies(numCourts, maxMixed, maxMens, maxWomens) {
    const strategies = [];
    for (let m = 0; m <= numCourts; m++) {
        for (let n = 0; n <= numCourts - m; n++) {
            const w = numCourts - m - n;
            if (m <= maxMixed && n <= maxMens && w <= maxWomens) {
                strategies.push({ mixedPerRound: m, mensPerRound: n, womensPerRound: w });
            }
        }
    }
    return strategies;
}

function simulateGameDistribution(numMales, numFemales, mixedPerRound, mensPerRound, womensPerRound, numRounds) {
    let playerStats = {};
    for (let i = 0; i < numMales; i++) playerStats[`m${i}`] = { gamesPlayed: 0, consecutiveRests: 0, gender: 'male' };
    for (let i = 0; i < numFemales; i++) playerStats[`f${i}`] = { gamesPlayed: 0, consecutiveRests: 0, gender: 'female' };
    const playerIds = Object.keys(playerStats);
    for (let r = 0; r < numRounds; r++) {
        const playersInRound = new Set();
        let availablePlayerIds = playerIds.filter(id => !playersInRound.has(id));
        availablePlayerIds.sort((a, b) => {
            const statsA = playerStats[a];
            const statsB = playerStats[b];
            if (statsA.consecutiveRests >= 1 && statsB.consecutiveRests === 0) return -1;
            if (statsA.consecutiveRests === 0 && statsB.consecutiveRests >= 1) return 1;
            return statsA.gamesPlayed - statsB.gamesPlayed;
        });
        let males = availablePlayerIds.filter(id => playerStats[id].gender === 'male');
        let females = availablePlayerIds.filter(id => playerStats[id].gender === 'female');
        for (let i = 0; i < mixedPerRound; i++) {
            if (males.length >= 2 && females.length >= 2) {
                const playersForMatch = [...males.splice(0, 2), ...females.splice(0, 2)];
                playersForMatch.forEach(id => playersInRound.add(id));
            }
        }
        for (let i = 0; i < mensPerRound; i++) {
            if (males.length >= 4) {
                const playersForMatch = males.splice(0, 4);
                playersForMatch.forEach(id => playersInRound.add(id));
            }
        }
        for (let i = 0; i < womensPerRound; i++) {
            if (females.length >= 4) {
                const playersForMatch = females.splice(0, 4);
                playersForMatch.forEach(id => playersInRound.add(id));
            }
        }
        playerIds.forEach(id => {
            if (playersInRound.has(id)) {
                playerStats[id].gamesPlayed++;
                playerStats[id].consecutiveRests = 0;
            } else {
                playerStats[id].consecutiveRests++;
            }
        });
    }
    const allGames = playerIds.map(id => playerStats[id].gamesPlayed);
    if (allGames.length === 0) return { minGames: 0, maxGames: 0 };
    const minGames = Math.min(...allGames);
    const maxGames = Math.max(...allGames);
    return { minGames, maxGames };
}
