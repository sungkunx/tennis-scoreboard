import { savePlayersToFirestore } from './members.js';

export const playerListContainer = document.getElementById('player-list-container');
export const addPlayerBtn = document.getElementById('add-player-btn');
export const generateBtn = document.getElementById('generate-btn');
export const numCourtsInput = document.getElementById('num-courts');
export const numRoundsInput = document.getElementById('num-rounds');
export const scheduleResult = document.getElementById('schedule-result');
export const loadingIndicator = document.getElementById('loading');
export const csvImportBtn = document.getElementById('csv-import-btn');
export const csvInputArea = document.getElementById('csv-input-area');
export const csvTextarea = document.getElementById('csv-textarea');
export const csvApplyBtn = document.getElementById('csv-apply-btn');
export const recommendationBox = document.getElementById('recommendation-box');
export const recommendationContent = document.getElementById('recommendation-content');
export const numMixedInput = document.getElementById('num-mixed');
export const numMensInput = document.getElementById('num-mens');
export const numWomensInput = document.getElementById('num-womens');
export const playerStatistics = document.getElementById('player-statistics');
export const shareSection = document.getElementById('share-section');
export const shareBtn = document.getElementById('share-btn');
export const optimizeBtn = document.getElementById('optimize-btn');
export const optimizeResult = document.getElementById('optimize-result');
export const optimizeMessage = document.getElementById('optimize-message');

// New DOM Elements for Auth and Member Management
export const authBtn = document.getElementById('auth-btn');
export const settingsBtn = document.getElementById('settings-btn');
export const loadMembersBtn = document.getElementById('load-members-btn');
export const loginModal = document.getElementById('login-modal');
export const membersModal = document.getElementById('members-modal');
export const loginSubmitBtn = document.getElementById('login-submit-btn');
export const groupCodeInput = document.getElementById('group-code-input');
export const savedMembersList = document.getElementById('saved-members-list');
export const addSelectedMembersBtn = document.getElementById('add-selected-members-btn');
export const selectAllMembers = document.getElementById('select-all-members');
export const newMemberNameInput = document.getElementById('new-member-name');
export const newMemberSkillInput = document.getElementById('new-member-skill');
export const addNewMemberBtn = document.getElementById('add-new-member-btn');
export const csvImportMembersBtn = document.getElementById('csv-import-members-btn');
export const genderBtnGroup = document.querySelector('.gender-btn-group');
export const csvImportMembersModal = document.getElementById('csv-import-modal-for-members');
export const csvTextareaMembers = document.getElementById('csv-textarea-members');
export const csvApplyMembersBtn = document.getElementById('csv-apply-members-btn');
export const swapModal = document.getElementById('swap-modal');

export const SKILL_MAP = { 1: '최하', 2: '하', 3: '중', 4: '상', 5: '최상' };

let playerIdCounter = 0;

export function openModal(modal) {
    modal.classList.add('is-open');
}

export function closeModal(modal) {
    modal.classList.remove('is-open');
}

export function addPlayerRow(name = '', gender = 'male', skill = 3) {
    playerIdCounter++;
    const playerRow = document.createElement('div');
    playerRow.className = 'player-row';
    playerRow.id = `player-${playerIdCounter}`;

    const skillOptions = Object.keys(SKILL_MAP).map(key => 
        `<option value="${key}" ${key == skill ? 'selected' : ''}>${SKILL_MAP[key]}</option>`
    ).join('');

    playerRow.innerHTML = `
        <span class="player-number"></span>
        <input type="text" placeholder="이름" data-type="name" value="${name}">
        <select data-type="gender">
            <option value="male" ${gender === 'male' || gender === 'M' ? 'selected' : ''}>남성</option>
            <option value="female" ${gender === 'female' || gender === 'F' ? 'selected' : ''}>여성</option>
        </select>
        <select data-type="skill">${skillOptions}</select>
        <button class="btn-danger" data-remove-id="${playerIdCounter}">X</button>
    `;
    playerListContainer.appendChild(playerRow);

    playerRow.querySelector('.btn-danger').addEventListener('click', (e) => {
        const idToRemove = e.target.getAttribute('data-remove-id');
        document.getElementById(`player-${idToRemove}`).remove();
        updatePlayerNumbers();
        updateRecommendation();
        savePlayersToFirestore(); // Save after removal
    });
}

export function updatePlayerNumbers() {
    const playerRows = playerListContainer.querySelectorAll('.player-row');
    playerRows.forEach((row, index) => {
        const playerNumberSpan = row.querySelector('.player-number');
        if (playerNumberSpan) {
            playerNumberSpan.textContent = index + 1;
        }
    });
}

export function displaySchedule(schedule, players) {
    scheduleResult.innerHTML = '<h2>생성된 대진표</h2>';
    const playerMap = new Map(players.map(p => [p.id, p]));
    schedule.forEach(round => {
        const roundEl = document.createElement('div');
        roundEl.className = 'round';
        let roundHTML = `<div class="round-title">${round.round} 라운드</div>`;
        if (round.matches.length === 0) {
            roundHTML += `<div class="match"><p>생성된 매치가 없습니다.</p></div>`;
        }
        round.matches.forEach((match, matchIndex) => {
            roundHTML += `
                <div class="match">
                    <div class="match-info">
                        코트 ${match.court} (${match.type})
                    </div>
                    <div class="team">
                        <span>
                            ${getPlayerTag(playerMap.get(match.team1[0].id), false, round.round - 1, matchIndex, 0, 0)}
                            ${getPlayerTag(playerMap.get(match.team1[1].id), false, round.round - 1, matchIndex, 0, 1)}
                        </span>
                        <span class="team-vs">VS</span>
                        <span>
                            ${getPlayerTag(playerMap.get(match.team2[0].id), false, round.round - 1, matchIndex, 1, 0)}
                            ${getPlayerTag(playerMap.get(match.team2[1].id), false, round.round - 1, matchIndex, 1, 1)}
                        </span>
                    </div>
                </div>
            `;
        });
        if (round.restingPlayers.length > 0) {
            roundHTML += `
                <div class="resting-players">
                    <b>휴식:</b> 
                    ${round.restingPlayers.map(p => getPlayerTag(p, true)).join(' ')}
                </div>
            `;
        }
        roundEl.innerHTML = roundHTML;
        scheduleResult.appendChild(roundEl);
    });
}

export function getPlayerTag(player, isResting = false, roundIndex = -1, matchIndex = -1, teamIndex = -1, playerIndex = -1) {
    if (!player) return '';
    const className = player.gender === 'male' ? 'player-male' : 'player-female';
    if (isResting) {
        return `<span class="player-tag ${className}">${player.name}</span>`;
    }
    return `<button class="player-tag ${className} player-button" 
                    data-player-id="${player.id}" 
                    data-round-index="${roundIndex}" 
                    data-match-index="${matchIndex}" 
                    data-team-index="${teamIndex}" 
                    data-player-index="${playerIndex}">
                ${player.name}
            </button>`;
}

export function displayStatistics(players, schedule) {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const stats = {};
    players.forEach(p => {
        stats[p.id] = {
            name: p.name,
            gender: p.gender,
            gamesPlayed: 0,
            gamesRested: 0
        };
    });
    schedule.forEach(round => {
        const playersInRound = new Set();
        round.matches.forEach(match => {
            match.team1.forEach(p => {
                playersInRound.add(p.id);
                stats[p.id].gamesPlayed++;
            });
            match.team2.forEach(p => {
                playersInRound.add(p.id);
                stats[p.id].gamesPlayed++;
            });
        });
        players.forEach(p => {
            if (!playersInRound.has(p.id)) {
                stats[p.id].gamesRested++;
            }
        });
    });
    const statsList = Object.values(stats).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    const minGames = Math.min(...statsList.map(s => s.gamesPlayed));
    const maxGames = Math.max(...statsList.map(s => s.gamesPlayed));
    let statsHTML = '<h2>플레이어 참여 통계</h2>';
    statsHTML += `<p style="margin-bottom: 15px; color: #666;">최소 게임 수: ${minGames}회 | 최대 게임 수: ${maxGames}회 | 차이: ${maxGames - minGames}회</p>`;
    statsHTML += '<div style="background-color: #f9f9f9; border-radius: 5px; padding: 15px; overflow-x: auto;">';
    statsHTML += '<table style="width: 100%; border-collapse: collapse;">';
    statsHTML += '<thead><tr style="background-color: #e0e0e0;">';
    statsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ccc;">이름</th>';
    statsHTML += '<th style="padding: 8px; text-align: center; border: 1px solid #ccc;">성별</th>';
    statsHTML += '<th style="padding: 8px; text-align: center; border: 1px solid #ccc;">게임 수</th>';
    statsHTML += '<th style="padding: 8px; text-align: center; border: 1px solid #ccc;">휴식 수</th>';
    statsHTML += '</tr></thead><tbody>';
    statsList.forEach(stat => {
        const genderText = stat.gender === 'male' ? '남' : '여';
        statsHTML += '<tr>';
        statsHTML += `<td style="padding: 8px; border: 1px solid #ccc;">${stat.name}</td>`;
        statsHTML += `<td style="padding: 8px; text-align: center; border: 1px solid #ccc;">${genderText}</td>`;
        statsHTML += `<td style="padding: 8px; text-align: center; border: 1px solid #ccc; font-weight: bold;">${stat.gamesPlayed}</td>`;
        statsHTML += `<td style="padding: 8px; text-align: center; border: 1px solid #ccc;">${stat.gamesRested}</td>`;
        statsHTML += '</tr>';
    });
    statsHTML += '</tbody></table></div>';
    playerStatistics.innerHTML = statsHTML;
    playerStatistics.style.display = 'block';
}

export function renderEditForm(memberId, currentName, currentGender, currentSkill) {
    const skillOptions = Object.keys(SKILL_MAP).map(s => 
        `<option value="${s}" ${s == currentSkill ? 'selected' : ''}>${SKILL_MAP[s]}</option>`
    ).join('');

    return `
        <input type="checkbox" class="member-checkbox" value="${memberId}" style="width: auto;" disabled>
        <div class="member-item-info">
            <input type="text" value="${currentName}" class="edit-name-input" style="font-size: 1rem; padding: 5px;">
            <div style="display: flex; gap: 5px; margin-top: 5px;">
                <select class="edit-gender-select" style="font-size: 0.9rem; padding: 5px;">
                    <option value="M" ${currentGender === 'M' ? 'selected' : ''}>남성</option>
                    <option value="F" ${currentGender === 'F' ? 'selected' : ''}>여성</option>
                </select>
                <select class="edit-skill-select" style="font-size: 0.9rem; padding: 5px;">
                    ${skillOptions}
                </select>
            </div>
        </div>
        <div class="member-item-actions">
            <button class="btn-xs btn-success" data-save-member-id="${memberId}">✔️</button>
            <button class="btn-xs btn-secondary" data-cancel-edit-id="${memberId}">✖️</button>
        </div>
    `;
}

export function getSkillText(skillValue) {
    return SKILL_MAP[skillValue] || '중';
}

export function updateRecommendation() {
    const playerRows = playerListContainer.querySelectorAll('.player-row');
    const numPlayers = playerRows.length;
    const numMales = Array.from(playerRows).filter(row => row.querySelector('select[data-type="gender"]').value === 'male').length;
    const numFemales = numPlayers - numMales;
    const numCourts = parseInt(numCourtsInput.value) || 0;
    const numRounds = parseInt(numRoundsInput.value) || 0;
    const totalGames = numCourts * numRounds;
    if (numPlayers < 4 || numCourts < 1 || numRounds < 1) {
        recommendationBox.style.display = 'none';
        return;
    }
    let recommendedMixed = 0;
    let recommendedMens = 0;
    let recommendedWomens = 0;
    const maxMixedPerRound = Math.min(Math.floor(numMales / 2), Math.floor(numFemales / 2), numCourts);
    const maxMensPerRound = Math.min(Math.floor(numMales / 4), numCourts);
    const maxWomensPerRound = Math.min(Math.floor(numFemales / 4), numCourts);
    const basePerType = Math.floor(numCourts / 3);
    const remainder = numCourts % 3;
    if (maxMixedPerRound >= basePerType && maxMensPerRound >= basePerType && maxWomensPerRound >= basePerType) {
        recommendedMixed = basePerType * numRounds;
        recommendedMens = basePerType * numRounds;
        recommendedWomens = basePerType * numRounds;
        if (remainder >= 1) recommendedMixed += numRounds;
        if (remainder >= 2) recommendedMens += numRounds;
    } else {
        const availableTypes = [];
        if (maxMixedPerRound > 0) availableTypes.push('mixed');
        if (maxMensPerRound > 0) availableTypes.push('mens');
        if (maxWomensPerRound > 0) availableTypes.push('womens');
        if (availableTypes.length > 0) {
            const perType = Math.floor(numCourts / availableTypes.length);
            const rem = numCourts % availableTypes.length;
            if (availableTypes.includes('mixed')) {
                recommendedMixed = Math.min(perType, maxMixedPerRound) * numRounds;
            }
            if (availableTypes.includes('mens')) {
                recommendedMens = Math.min(perType, maxMensPerRound) * numRounds;
            }
            if (availableTypes.includes('womens')) {
                recommendedWomens = Math.min(perType, maxWomensPerRound) * numRounds;
            }
            if (rem > 0 && recommendedMixed < maxMixedPerRound * numRounds) {
                recommendedMixed += numRounds;
            }
        }
    }
    recommendationContent.innerHTML = `
        <p style="margin: 5px 0;">
            <strong>참여 인원:</strong> 남성 ${numMales}명, 여성 ${numFemales}명, 총 ${numPlayers}명<br>
            <strong>총 게임 수:</strong> ${totalGames}개 (코트 ${numCourts} × 라운드 ${numRounds})<br>
            <strong>기본 추천:</strong> 혼복 ${recommendedMixed}개, 남복 ${recommendedMens}개, 여복 ${recommendedWomens}개<br>
            <small style="color: #666;">💡 더 정확한 최적 구성은 아래 "최적 게임 구성 자동 계산" 버튼을 눌러주세요</small>
        </p>
    `;
    numMixedInput.value = recommendedMixed;
    numMensInput.value = recommendedMens;
    numWomensInput.value = recommendedWomens;
    recommendationBox.style.display = 'block';
}

export function handlePlayerSwap(e, lastGeneratedSchedule, lastPlayerList) {
    const button = e.target.closest('.player-button');
    if (!button) return;
    const { playerId, roundIndex, matchIndex, teamIndex, playerIndex } = button.dataset;
    const round = lastGeneratedSchedule[roundIndex];
    const match = round.matches[matchIndex];
    const team = teamIndex == 0 ? match.team1 : match.team2;
    const playerToSwap = team[playerIndex];
    const restingPlayers = round.restingPlayers;
    if (restingPlayers.length === 0) {
        alert("교체할 휴식 선수가 없습니다.");
        return;
    }
    const modal = document.getElementById('swap-modal');
    const modalTitle = document.getElementById('swap-modal-title');
    const restingList = document.getElementById('swap-modal-resting-list');
    const closeButton = modal.querySelector('.close-button');
    modalTitle.textContent = `${playerToSwap.name} 선수와 교체`;
    restingList.innerHTML = restingPlayers.map(p => `<button class="player-tag ${p.gender === 'male' ? 'player-male' : 'player-female'} swap-option" data-swap-player-id="${p.id}">${p.name}</button>`).join('');
    openModal(modal);
    closeButton.onclick = () => {
        closeModal(modal);
    };
    modal.querySelectorAll('.swap-option').forEach(option => {
        option.onclick = () => {
            const swapPlayerId = option.dataset.swapPlayerId;
            const playerMap = new Map(lastPlayerList.map(p => [p.id, p]));
            const newPlayer = playerMap.get(swapPlayerId);
            const originalPlayer = playerToSwap;
            team[playerIndex] = newPlayer;
            const newRestingPlayers = restingPlayers.filter(p => p.id !== newPlayer.id);
            newRestingPlayers.push(originalPlayer);
            round.restingPlayers = newRestingPlayers;
            displaySchedule(lastGeneratedSchedule, lastPlayerList);
            displayStatistics(lastPlayerList, lastGeneratedSchedule);
            closeModal(modal);
        };
    });
}
