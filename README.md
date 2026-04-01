# 📄 Sistema de Gestió i Classificació de Contractació Pública (Wiki/Manual)

Aquest document serveix com a manual d'instal·lació, configuració i operació del sistema de contractació. L'aplicació permet el monitoratge de contractes, la gestió de contractes menors i la classificació intel·ligent de codis **CPV (Common Procurement Vocabulary)**.

## 🏗️ 1. Arquitectura del Sistema

El sistema està modularitzat per separar la lògica de dades de la interfície d'usuari:

*   **Backend (FastAPI)**: Serveix l'API REST, gestiona l'autenticació (JWT + opcionalment LDAP) i automatitza les sincronitzacions amb fonts de dades obertes.
*   **Frontend (React + Vite)**: Una Single Page Application (SPA) dissenyada amb tipografia moderna, estètica premium (glassmorphism) i components reutilitzables.
*   **Base de Dades (SQLite)**: Fitxer local `backend/contratos.db`. (Fàcilment migratòria a PostgreSQL).
*   **IA de Classificació (Ollama)**: Motor d'inferència local per a la categorització semàntica de productes i serveis.

---

## 🚀 2. Guia d'Instal·lació (Pas a pas)

### A. Preparació del Servidor / Entorn
Assegura't de tenir instal·lats **Python 3.10+**, **Node.js 18+** i **npm**.

### B. Configuració del Backend
1. Entra a la carpeta del backend: `cd backend`
2. Crea un entorn virtual: `python -m venv venv`
3. Activa l'entorn:
    - Windows: `.\venv\Scripts\activate`
    - Linux/Mac: `source venv/bin/activate`
4. Instal·la les llibreries: `pip install -r requirements.txt`
5. Configura el fitxer `.env` (crea'l si no existeix):
    ```env
    SECRET_KEY=la_teva_clau_per_a_jwt
    # Opcional si fas servir LDAP:
    LDAP_SERVER=ldap://servidor
    LDAP_BASE_DN=dc=exemple,dc=com
    ```

### C. Configuració del Frontend
1. Entra a la carpeta: `cd frontend`
2. Instal·la dependències: `npm install`
3. Crea el build de producció: `npm run build`

---

## 🛠️ 3. Configuració General a l'Aplicació

Un cop en marxa, accedeix a la secció d'**Administració** des de la barra lateral per configurar els paràmetres globals:

1.  **Codi INE10**: El codi d'ens de la teva administració per a les sincronitzacions automàtiques.
2.  **Endpoints**: URLs de les APIs de Dades Obertes de Catalunya.
3.  **URL Ollama**: Normalment `http://localhost:11434`.
4.  **Model IA**: Nom del model per defecte (ex: `llama3`, `mistral`, etc.).

---

## 🧠 4. Sistema Especial de Classificació CPV

El sistema utilitza una lògica de classificació en tres capes:

1.  **Cerca per paraules clau**: El sistema busca coincidències exactes o parcials a la base de dades local de CPVs.
2.  **Motor Semàntic**: Si no hi ha resultats clars, l'Ollama analitza l'objecte del contracte per trobar el sector d'activitat més proper.
3.  **Refinament Automàtic**: La IA proposa fins a 5 codis amb un percentatge de probabilitat i una justificació raonada en català.

---

## 📦 5. Manteniment de Producció

*   **Logs**: Els errors de sincronització o IA s'emmagatzemen al log del backend per a la seva depuració.
*   **Actualització CPV**: Periòdicament, es recomana prémer el botó "Sincronitzar CPVs" a la secció de Sincronització per tenir el llistat oficial actualitzat.
*   **Base de dades**: Pots fer còpies de seguretat diàries copiant simplement el fitxer `backend/contratos.db`.

---

## 📂 Estructura de fitxers rellevant

*   `backend/services/ollama_service.py`: On resideix tota la màgia de la IA.
*   `backend/services/cpv_service.py`: Lògica per importar diccionaris CPV.
*   `frontend/src/api/client.ts`: Definició de totes les interfícies de comunicació.
*   `frontend/src/pages/ConfiguracionPage.tsx`: Panell central de gestió.
