import { initAuth, handleAuthClick, handleLogin } from './auth.js';
import { handleLoadMembersClick, handleMembersModalClick, addSelectedMembers, handleSettingsClick } from './members.js';
import { generateSchedule, getGameConfigurationRecommendations } from './schedule.js';
import { 
    playerListContainer, addPlayerBtn, generateBtn, numCourtsInput, numRoundsInput, scheduleResult, 
    loadingIndicator, csvImportBtn, csvInputArea, csvTextarea, csvApplyBtn, recommendationBox, 
    recommendationContent, numMixedInput, numMensInput, numWomensInput, playerStatistics, shareSection, 
    shareBtn, optimizeBtn, optimizeResult, optimizeMessage, authBtn, settingsBtn, loadMembersBtn, 
    loginModal, membersModal, loginSubmitBtn, groupCodeInput, savedMembersList, addSelectedMembersBtn, 
    selectAllMembers, newMemberNameInput, newMemberSkillInput, addNewMemberBtn, csvImportMembersBtn, 
    genderBtnGroup, csvImportMembersModal, csvTextareaMembers, csvApplyMembersBtn, swapModal, 
    addPlayerRow, updatePlayerNumbers, displaySchedule, displayStatistics, updateRecommendation, openModal, closeModal, handlePlayerSwap
} from './ui.js';
import { savePlayersToFirestore } from './members.js';

document.addEventListener('DOMContentLoaded', () => {
    let lastGeneratedSchedule = null;
    let lastPlayerList = null;

    initAuth();

    // --- Modal Closing Logic ---
    document.querySelectorAll('.modal .close-button, [data-action="close-csv-modal"]').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    // --- Event Listeners ---
    authBtn.addEventListener('click', handleAuthClick);
    loginSubmitBtn.addEventListener('click', handleLogin);
    groupCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    loadMembersBtn.addEventListener('click', handleLoadMembersClick);
    settingsBtn.addEventListener('click', handleSettingsClick);
    membersModal.addEventListener('click', handleMembersModalClick);
    addSelectedMembersBtn.addEventListener('click', addSelectedMembers);
    selectAllMembers.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        savedMembersList.querySelectorAll('.member-checkbox').forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = isChecked;
            }
        });
    });

    addPlayerBtn.addEventListener('click', () => {
        addPlayerRow();
        updatePlayerNumbers();
        savePlayersToFirestore(); // Save after adding a player
    });

    csvImportBtn.addEventListener('click', () => {
        csvInputArea.style.display = csvInputArea.style.display === 'none' ? 'block' : 'none';
    });

    csvApplyBtn.addEventListener('click', () => {
        const csvText = csvTextarea.value.trim();
        if (!csvText) return;
        playerListContainer.innerHTML = '';
        csvText.split('\n').forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 3 && parts[0]) {
                addPlayerRow(parts[0], parts[1], parseInt(parts[2]) || 3);
            }
        });
        updatePlayerNumbers();
        csvInputArea.style.display = 'none';
        csvTextarea.value = '';
        updateRecommendation();
        savePlayersToFirestore(); // Save after CSV import
    });

    [numCourtsInput, numRoundsInput, numMensInput, numWomensInput].forEach(input => {
        input.addEventListener('input', updateGameCounts);
    });

    document.addEventListener('click', (e) => {
        let targetInput;
        let step = 0;
        if (e.target.matches('[data-step-up]')) {
            targetInput = document.getElementById(e.target.dataset.stepUp);
            step = 1;
        } else if (e.target.matches('[data-step-down]')) {
            targetInput = document.getElementById(e.target.dataset.stepDown);
            step = -1;
        }
        if (targetInput) {
            let value = parseInt(targetInput.value) || 0;
            targetInput.value = Math.max(0, value + step);
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    scheduleResult.addEventListener('click', (e) => handlePlayerSwap(e, lastGeneratedSchedule, lastPlayerList));

    generateBtn.addEventListener('click', () => {
        loadingIndicator.style.display = 'block';
        scheduleResult.innerHTML = '';
        playerStatistics.style.display = 'none';
        shareSection.style.display = 'none';
        const players = [];
        const playerRows = playerListContainer.querySelectorAll('.player-row');
        playerRows.forEach(row => {
            const name = row.querySelector('input[data-type="name"]').value.trim() || row.querySelector('input[data-type="name"]').placeholder;
            const gender = row.querySelector('select[data-type="gender"]').value;
            const skill = parseInt(row.querySelector('select[data-type="skill"]').value, 10);
            players.push({ id: row.id, name, gender, skill });
        });
        const numCourts = parseInt(numCourtsInput.value, 10);
        const numRounds = parseInt(numRoundsInput.value, 10);
        const targetMixed = parseInt(numMixedInput.value) || 0;
        const targetMens = parseInt(numMensInput.value) || 0;
        const targetWomens = parseInt(numWomensInput.value) || 0;
        if (players.length < 4) {
            alert('최소 4명의 선수가 필요합니다.');
            loadingIndicator.style.display = 'none';
            return;
        }
        setTimeout(() => {
            try {
                const gameConfig = { targetMixed, targetMens, targetWomens };
                const schedule = generateSchedule(players, numCourts, numRounds, gameConfig);
                lastGeneratedSchedule = schedule;
                lastPlayerList = players;
                displaySchedule(schedule, players);
                displayStatistics(players, schedule);
                shareSection.style.display = 'block';
            } catch (error) {
                console.error(error);
                scheduleResult.innerHTML = `<p style="color:var(--danger-color);">대진표 생성 중 오류가 발생했습니다: ${error.message}</p>`;
            } finally {
                loadingIndicator.style.display = 'none';
            }
        }, 50);
    });

    shareBtn.addEventListener('click', () => {
        if (!lastGeneratedSchedule || !lastPlayerList) {
            alert('먼저 대진표를 생성해주세요.');
            return;
        }

        // --- Time Select Options ---
        let hourOptions = '<option value="">--</option>';
        for (let i = 0; i < 24; i++) {
            hourOptions += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }

        let minuteOptions = '<option value="">--</option>';
        for (let i = 0; i < 12; i++) {
            const min = i * 5;
            minuteOptions += `<option value="${min}">${String(min).padStart(2, '0')}</option>`;
        }
        const timeSelectorHTML = `<select class="hour-select">${hourOptions}</select>:<select class="minute-select">${minuteOptions}</select>`;

        // --- Schedule Blocks ---
        let scheduleBlocksHTML = '';
        lastGeneratedSchedule.forEach(round => {
            let matchesHTML = '';
            round.matches.forEach(match => {
                const team1Names = match.team1.map(p => p.name).join('/');
                const team2Names = match.team2.map(p => p.name).join('/');
                matchesHTML += `<li class="match-item"><strong>코트 ${match.court}:</strong> ${team1Names} VS ${team2Names}</li>`;
            });

            let restingPlayersHTML = '';
            if (round.restingPlayers.length > 0) {
                restingPlayersHTML = `<div class="resting-players"><strong>휴식:</strong> ${round.restingPlayers.map(p => p.name).join(', ')}</div>`;
            }

            scheduleBlocksHTML += `
                <div class="round-block">
                    <div class="round-header">
                        <h2>${round.round} 라운드</h2>
                        <div class="time-select-container">
                            ${timeSelectorHTML}
                        </div>
                    </div>
                    <ul class="match-list">
                        ${matchesHTML}
                    </ul>
                    ${restingPlayersHTML}
                </div>
            `;
        });

        // --- Final HTML for the new window ---
        const shareHTML = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>테니스 대진표</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 15px; margin: 0; background-color: #f7f7f7; }
                    h1 { text-align: center; color: #333; }
                    .schedule-container { max-width: 800px; margin: 0 auto; }
                    .round-block { background-color: #fff; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    .round-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
                    .round-header h2 { margin: 0; font-size: 1.2rem; color: #007bff; }
                    select { padding: 5px; font-size: 0.9rem; border-radius: 4px; border: 1px solid #ccc; margin: 0 2px; }
                    .match-list { list-style: none; padding: 0; margin: 0; }
                    .match-item { padding: 8px 0; border-bottom: 1px solid #f2f2f2; }
                    .match-item:last-child { border-bottom: none; }
                    .resting-players { margin-top: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 4px; font-size: 0.9rem; color: #555; }
                    .copy-notice { background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
                    #copy-btn { display: block; width: 100%; padding: 12px; margin-top: 20px; font-size: 1rem; cursor: pointer; background-color: #28a745; color: white; border: none; border-radius: 5px; font-weight: bold; }
                    #copy-btn:hover { background-color: #218838; }
                </style>
            </head>
            <body>
                <div class="copy-notice">✅ 아래 내용을 복사 버튼을 눌러 클립보드에 복사하세요! (시간 정보는 복사되지 않습니다)</div>
                <div class="schedule-container" id="schedule-container">
                    ${scheduleBlocksHTML}
                </div>
                <button id="copy-btn" onclick="copySchedule()">클립보드에 복사</button>
                <script>
                    function copySchedule() {
                        let shareText = '🎾 테니스 대진표\\n\\n';
                        const container = document.getElementById('schedule-container');
                        
                        container.querySelectorAll('.round-block').forEach(roundBlock => {
                            const roundTitle = roundBlock.querySelector('h2').innerText;
                            
                            // Get the selected hour and minute
                            const hourSelect = roundBlock.querySelector('.hour-select');
                            const minuteSelect = roundBlock.querySelector('.minute-select');

                            let timeInfo = '';
                            if (hourSelect && minuteSelect && hourSelect.value !== '' && minuteSelect.value !== '') {
                                const hour = String(hourSelect.value).padStart(2, '0');
                                const minute = String(minuteSelect.value).padStart(2, '0');
                                timeInfo = 'Start Time: ' + hour + ':' + minute + '\\n';
                            }

                            shareText += '=== ' + roundTitle + ' ===\\n';
                            if (timeInfo) {
                                shareText += timeInfo;
                            }

                            roundBlock.querySelectorAll('.match-item').forEach(matchItem => {
                                const fullText = matchItem.innerText;
                                const matchContent = fullText.substring(fullText.indexOf(':') + 1).trim();
                                const courtTitle = fullText.substring(0, fullText.indexOf(':'));
                                shareText += courtTitle + ': ' + matchContent + '\\n';
                            });
                            
                            const restingPlayersDiv = roundBlock.querySelector('.resting-players');
                            if (restingPlayersDiv) {
                                const restingText = restingPlayersDiv.innerText;
                                shareText += restingText + '\\n';
                            }
                            shareText += '\\n';
                        });

                        navigator.clipboard.writeText(shareText).then(() => {
                            alert('클립보드에 복사되었습니다!');
                        }, () => {
                            alert('클립보드 복사에 실패했습니다.');
                        });
                    }
                </script>
            </body>
            </html>
        `;

        const shareWindow = window.open('', '대진표 공유', 'width=800,height=600');
        shareWindow.document.write(shareHTML);
        shareWindow.document.close();
    });

    function updateGameCounts(event) {
        const numCourts = parseInt(numCourtsInput.value) || 0;
        const numRounds = parseInt(numRoundsInput.value) || 0;
        const totalGames = numCourts * numRounds;
        let mens = parseInt(numMensInput.value) || 0;
        let womens = parseInt(numWomensInput.value) || 0;
        if (event) {
            const changedInput = event.target;
             if (mens + womens > totalGames) {
                if (changedInput === numMensInput) {
                    womens = totalGames - mens;
                } else if (changedInput === numWomensInput) {
                    mens = totalGames - womens;
                }
            }
        }
        mens = Math.max(0, mens);
        womens = Math.max(0, womens);
        const mixed = Math.max(0, totalGames - mens - womens);
        numMensInput.value = mens;
        numWomensInput.value = womens;
        numMixedInput.value = mixed;
    }

    optimizeBtn.addEventListener('click', () => {
        const playerRows = playerListContainer.querySelectorAll('.player-row');
        const numPlayers = playerRows.length;
        const numMales = Array.from(playerRows).filter(row => row.querySelector('select[data-type="gender"]').value === 'male').length;
        const numFemales = numPlayers - numMales;
        const numCourts = parseInt(numCourtsInput.value) || 0;
        const numRounds = parseInt(numRoundsInput.value) || 0;
        if (numPlayers < 4 || numCourts < 1 || numRounds < 1) {
            alert('참여 인원, 코트 수, 라운드 수를 먼저 설정해주세요.');
            return;
        }
        optimizeResult.style.display = 'block';
        optimizeMessage.textContent = '최적 조합을 계산 중입니다...';
        setTimeout(() => {
            const recommendations = getGameConfigurationRecommendations(numMales, numFemales, numCourts, numRounds);
            if (recommendations.length === 0) {
                optimizeMessage.innerHTML = '❌ 추천 가능한 게임 구성을 찾을 수 없습니다.';
                return;
            }
            const bestOverall = recommendations[0].config;
            numMixedInput.value = bestOverall.mixed;
            numMensInput.value = bestOverall.mens;
            numWomensInput.value = bestOverall.womens;
            let recommendationsHTML = '<h5>추천 전략 (클릭하여 적용)</h5>';
            recommendations.forEach((rec, index) => {
                const isRecommended = rec.title.includes('(추천)');
                recommendationsHTML += `
                    <button class="btn ${isRecommended ? 'btn-primary' : 'btn-secondary'} recommendation-btn" 
                            data-mixed="${rec.config.mixed}" 
                            data-mens="${rec.config.mens}" 
                            data-womens="${rec.config.womens}">
                        ${rec.title} (혼${rec.config.mixed}/남${rec.config.mens}/여${rec.config.womens})
                    </button>
                `;
            });
            optimizeMessage.innerHTML = recommendationsHTML;
            const recButtons = optimizeMessage.querySelectorAll('.recommendation-btn');
            recButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget;
                    numMixedInput.value = target.dataset.mixed;
                    numMensInput.value = target.dataset.mens;
                    numWomensInput.value = target.dataset.womens;
                    recButtons.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
                    target.classList.remove('btn-secondary');
                    target.classList.add('btn-primary');
                });
            });
        }, 100);
    });
});
