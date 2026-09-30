# Syntion Assistive AI — Video Proof di Navigazione & Build

Questo repository contiene i video di prova della navigazione visiva e i pacchetti di test per **Syntion Assistive Intelligence**.

---

## 🎬 Video di Prova Ufficiali (GitHub Releases)

I video completi in alta definizione sono scaricabili e visualizzabili direttamente tramite i link ufficiali di GitHub Release:

| # | Scenario di Prova | Durata / Dimensione | Link Diretto Download Video GitHub |
|---|---|---|---|
| **1** | **Casa Multi-Stanza & Porte POV (Nuovo)** | 60s · 34 MB | [Scarica `indoor_house_60s_navigation_proof.mp4`](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/indoor_house_60s_navigation_proof.mp4) |
| **2** | **Corsia Negozio & Bypass Pedana** | 60s · 22 MB | [Scarica `indoor_complex_aisle_60s_proof.mp4`](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/indoor_complex_aisle_60s_proof.mp4) |
| **3** | **Outdoor Shibuya Crossing & Folla** | 56s · 63 MB | [Scarica `outdoor_urban_60s_navigation_proof.mp4`](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/outdoor_urban_60s_navigation_proof.mp4) |
| **4** | **Aula Studenti Seduti / Transizione** | 15s · 4.8 MB | [Scarica `indoor_multi_obstacle_proof.mp4`](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/indoor_multi_obstacle_proof.mp4) |
| **5** | **Audio Assistente Syntion (1 Minuto Reale)** | 1:00 · 475 KB | [Scarica `syntion_assistant_real_conversation_1min.mp3`](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/syntion_assistant_real_conversation_1min.mp3) |

> 🔗 **Tutti i file della Release su GitHub**: [Release v1.0-proof](https://github.com/Giobeck25/gio-transcript/releases/tag/v1.0-proof)  
> 🌐 **Streaming Web Player Live (senza download)**: [Syntion Web Player](https://moves-furthermore-dude-innovative.trycloudflare.com)

---

## 📸 Anteprime e Risoluzioni Chiave

### 1. Casa Multi-Stanza & Porte POV (Nuovo Video)
- **Precedenza assoluta gradini sotto i piedi**: Se ci sono gradini ascendenti (gradini d'ingresso o interni), l'indicazione di varco porta aperto è tassativamente bloccata.
- **Disqualifica mano/braccio proprio**: La mano che si allunga per aprire la porta non viene mai più confusa con un pedone (zero falsi allarmi di stop collisione).
- **Riconoscimento barriere e cancelli (`gate`)**: Riconoscimento accurato con avviso vocale *"Cancello davanti: aprilo per proseguire"*.

![Anteprima Corridoio Casa](assets/keyframes/indoor_house_60s_navigation_proof_keyframe_10.png)
![Anteprima Salone & Porte](assets/keyframes/indoor_house_60s_navigation_proof_keyframe_70.png)
![Anteprima Navigazione Multi-Stanza](assets/keyframes/indoor_house_60s_navigation_proof_keyframe_180.png)

---

### 2. Corsia Negozio & Bypass Pedana Merci
- Griglia prospettica 3D del suolo attiva.
- Rilevamento continuo del pallet e aggiramento dinamico a sinistra (`VEER_LEFT`). Zero allucinazioni su scaffali o pareti.

![Anteprima Corsia Negozio](assets/keyframes/indoor_complex_aisle_60s_proof_keyframe_70.png)

---

### 3. Outdoor Shibuya Crossing & Folla
- Attraversamento pedonale assistito in ambiente urbano denso.
- Rilevamento e filtraggio semafori, strisce pedonali e gestione passaggi stretti.

![Anteprima Outdoor Shibuya](assets/keyframes/outdoor_urban_60s_navigation_proof_keyframe_70.png)

---

### 4. Aula Studenti Seduti & Transizione Postura
- Classificazione stabile di studenti seduti e riconoscimento immediato della persona che si alza in piedi.

![Anteprima Aula Studenti](assets/keyframes/indoor_multi_obstacle_proof_keyframe_70.png)

---

## 📱 Pacchetti APK Android

| Applicazione | Variante | Dimensione | Download Diretto GitHub |
|---|---|---|---|
| **SyntionDevice** | Debug (Device/Glass) | 285 MB | [SyntionDevice-debug.apk](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/SyntionDevice-debug.apk) |
| **SyntionCompanion** | Debug (Smartphone) | 173 MB | [SyntionCompanion-debug.apk](https://github.com/Giobeck25/gio-transcript/releases/download/v1.0-proof/SyntionCompanion-debug.apk) |
