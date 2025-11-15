import { db } from './firebase.js';
import { getGroupCode, handleLogout } from './auth.js';
import { openModal, closeModal, membersModal, savedMembersList, newMemberNameInput, newMemberSkillInput, genderBtnGroup, addPlayerRow, updatePlayerNumbers, updateRecommendation, renderEditForm, getSkillText, playerListContainer, selectAllMembers } from './ui.js';

let unsubscribePlayerListener = null;

export async function savePlayersToFirestore() {
    const groupCode = getGroupCode();
    if (!groupCode) return;

    const players = [];
    const playerRows = playerListContainer.querySelectorAll('.player-row');
    playerRows.forEach(row => {
        const name = row.querySelector('input[data-type="name"]').value.trim();
        const gender = row.querySelector('select[data-type="gender"]').value;
        const skill = parseInt(row.querySelector('select[data-type="skill"]').value, 10);
        players.push({ name, gender, skill });
    });

    const sessionRef = db.collection('groups').doc(groupCode).collection('sessions').doc('current');
    await sessionRef.set({ players });
}

export function listenForPlayerChanges() {
    const groupCode = getGroupCode();
    if (!groupCode) return;

    const sessionRef = db.collection('groups').doc(groupCode).collection('sessions').doc('current');
    unsubscribePlayerListener = sessionRef.onSnapshot(doc => {
        playerListContainer.innerHTML = ''; // Clear current list
        if (doc.exists) {
            const players = doc.data().players || [];
            players.forEach(player => {
                addPlayerRow(player.name, player.gender, player.skill);
            });
        }
        updatePlayerNumbers();
        updateRecommendation();
    });
}

export function stopListeningForPlayerChanges() {
    if (unsubscribePlayerListener) {
        unsubscribePlayerListener();
        unsubscribePlayerListener = null;
    }
}

export async function handleLoadMembersClick() {
    const groupCode = getGroupCode();
    if (!groupCode) {
        alert('먼저 로그인해주세요.');
        return;
    }
    selectAllMembers.checked = false;
    await renderMembersModal();
    openModal(membersModal);
}

async function renderMembersModal() {
    const groupCode = getGroupCode();
    const membersRef = db.collection('groups').doc(groupCode).collection('members');
    try {
        const snapshot = await membersRef.orderBy('name').get();
        let membersHTML = '';
        if (snapshot.empty) {
            membersHTML = '<p style="text-align: center; padding: 20px;">저장된 멤버가 없습니다.</p>';
        } else {
            snapshot.forEach(doc => {
                const member = doc.data();
                membersHTML += `
                    <div class="member-item" id="member-item-${doc.id}">
                        <input type="checkbox" class="member-checkbox" value="${doc.id}" style="width: auto;">
                        <div class="member-item-info">
                            <strong>${member.name}</strong>
                            <span>${member.gender === 'M' ? '남성' : '여성'} / ${getSkillText(member.skill)}</span>
                        </div>
                        <div class="member-item-actions">
                            <button class="btn-xs" data-edit-member-id="${doc.id}">✏️</button>
                            <button class="btn-xs btn-danger" data-delete-member-id="${doc.id}">🗑️</button>
                        </div>
                    </div>
                `;
            });
        }
        savedMembersList.innerHTML = membersHTML;
    } catch (error) {
        console.error("Error rendering members modal:", error);
        savedMembersList.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">멤버 목록을 불러오는 데 실패했습니다. Firestore 보안 규칙을 확인해주세요.</p>';
    }
}

export async function handleMembersModalClick(e) {
    const groupCode = getGroupCode();
    const target = e.target;
    const memberItem = target.closest('.member-item');

    // Add New Member
    if (target.id === 'add-new-member-btn') {
        const name = newMemberNameInput.value.trim();
        const gender = genderBtnGroup.querySelector('.active').dataset.gender;
        const skill = parseInt(newMemberSkillInput.value, 10);

        if (!name) {
            alert('이름을 입력해주세요.');
            return;
        }

        const membersRef = db.collection('groups').doc(groupCode).collection('members');
        await membersRef.add({ name, gender, skill });
        newMemberNameInput.value = '';
        await renderMembersModal();
    }
    // Delete Member
    else if (target.dataset.deleteMemberId) {
        const memberId = target.dataset.deleteMemberId;
        if (confirm('정말로 이 멤버를 삭제하시겠습니까?')) {
            const memberRef = db.collection('groups').doc(groupCode).collection('members').doc(memberId);
            await memberRef.delete();
            await renderMembersModal();
        }
    }
    // Edit Member (Switch to Edit Mode)
    else if (target.dataset.editMemberId) {
        const memberId = target.dataset.editMemberId;
        const name = memberItem.querySelector('strong').textContent;
        const infoText = memberItem.querySelector('span').textContent;
        const gender = infoText.includes('남성') ? 'M' : 'F';
        const skillValue = infoText.split('/')[1].trim();
        const skill = Object.keys(SKILL_MAP).find(key => SKILL_MAP[key] === skillValue) || 3;
        
        memberItem.innerHTML = renderEditForm(memberId, name, gender, skill);
    }
    // Save Member
    else if (target.dataset.saveMemberId) {
        const memberId = target.dataset.saveMemberId;
        const newName = memberItem.querySelector('.edit-name-input').value.trim();
        const newGender = memberItem.querySelector('.edit-gender-select').value;
        const newSkill = parseInt(memberItem.querySelector('.edit-skill-select').value, 10);

        if (!newName) {
            alert('이름을 입력해주세요.');
            return;
        }

        const memberRef = db.collection('groups').doc(groupCode).collection('members').doc(memberId);
        await memberRef.update({ name: newName, gender: newGender, skill: newSkill });
        await renderMembersModal();
    }
    // Cancel Edit
    else if (target.dataset.cancelEditId) {
        await renderMembersModal();
    }
    // Gender Button Group
    else if (target.closest('.gender-btn-group')) {
        if (target.tagName === 'BUTTON') {
            genderBtnGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
        }
    }
}

export async function addSelectedMembers() {
    const groupCode = getGroupCode();
    const selectedCheckboxes = savedMembersList.querySelectorAll('.member-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        alert('추가할 멤버를 선택해주세요.');
        return;
    }

    playerListContainer.innerHTML = '';

    const membersRef = db.collection('groups').doc(groupCode).collection('members');
    for (const checkbox of selectedCheckboxes) {
        const memberId = checkbox.value;
        try {
            const doc = await membersRef.doc(memberId).get();
            if (doc.exists) {
                const member = doc.data();
                addPlayerRow(member.name, member.gender, member.skill);
            }
        } catch (error) {
            console.error("Error fetching member:", error);
        }
    }
    updatePlayerNumbers();
    closeModal(membersModal);
    updateRecommendation();
    savePlayersToFirestore();
}

export function handleSettingsClick() {
    if (confirm('이 모임의 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        handleDeleteGroupData();
    }
}

async function handleDeleteGroupData() {
    const groupCode = getGroupCode();
    if (!groupCode) return;

    const groupRef = db.collection('groups').doc(groupCode);
    
    // Delete all members in the subcollection
    const membersSnapshot = await groupRef.collection('members').get();
    const batch = db.batch();
    membersSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the group document itself
    await groupRef.delete();

    alert('모임 데이터가 모두 삭제되었습니다.');
    handleLogout();
}