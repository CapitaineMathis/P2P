const ui = {
    btnCreate: document.getElementById("btnCreate"),
    myToken: document.getElementById("myToken"),
    remoteToken: document.getElementById("remoteToken"),
    btnConnect: document.getElementById("btnConnect"),
    status: document.getElementById("status"),
    msgInput: document.getElementById("msgInput"),
    btnSend: document.getElementById("btnSend"),
    logs: document.getElementById("logs"),
};

let dataChannel = null;

// Instance unique réutilisable
const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

// Événement déclenché quand tous les candidats ICE sont packagés dans le SDP
peer.onicecandidate = (event) => {
    if (!event.candidate) {
        ui.myToken.value = JSON.stringify(peer.localDescription);
    }
};

// Configuration des écouteurs du DataChannel
function setupChannel(channel) {
    dataChannel = channel;

    dataChannel.onopen = () => {
        ui.status.textContent = "Statut : Connecté en P2P direct !";
        ui.msgInput.disabled = false;
        ui.btnSend.disabled = false;
    };

    dataChannel.onclose = () => {
        ui.status.textContent = "Statut : Déconnecté";
        ui.msgInput.disabled = true;
        ui.btnSend.disabled = true;
    };

    dataChannel.onmessage = (e) => {
        ui.logs.textContent += `Pair distant : ${e.data}\n`;
    };
}

// Si on est le récepteur (Pair B), on intercepte le canal ouvert par A
peer.ondatachannel = (event) => {
    setupChannel(event.channel);
};

// --- Action 1 : Devenir l'initiateur (Pair A) ---
ui.btnCreate.addEventListener("click", async () => {
    // 1. Création explicite du canal de données
    const channel = peer.createDataChannel("chat");
    setupChannel(channel);

    // 2. Création et enregistrement de l'offre
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    ui.btnCreate.disabled = true;
});

// --- Action 2 : Traiter le jeton reçu (gère l'Offre ET la Réponse) ---
ui.btnConnect.addEventListener("click", async () => {
    const remoteData = JSON.parse(ui.remoteToken.value.trim());

    if (remoteData.type === "offer") {
        // Cas Pair B : On reçoit l'offre de A
        await peer.setRemoteDescription(remoteData);

        // On génère la réponse
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        // Le textarea "myToken" se remplira automatiquement via peer.onicecandidate
    } else if (remoteData.type === "answer") {
        // Cas Pair A : On reçoit la réponse finale de B
        await peer.setRemoteDescription(remoteData);
    }
});

// --- Envoi d'un message textuel ---
ui.btnSend.addEventListener("click", () => {
    const text = ui.msgInput.value.trim();
    if (!text || !dataChannel) return;

    dataChannel.send(text);
    ui.logs.textContent += `Moi : ${text}\n`;
    ui.msgInput.value = "";
});
